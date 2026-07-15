<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\MobileSession;
use App\Models\User;
use App\Support\AuditRecorder;
use App\Support\MobileTokenManager;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class PasswordRecoveryController extends Controller
{
    public function __construct(
        private readonly AuditRecorder $audit,
        private readonly MobileTokenManager $mobileTokens,
    ) {}

    public function requestLink(ForgotPasswordRequest $request): JsonResponse
    {
        Password::sendResetLink(['email' => $request->string('email')->toString()]);
        $this->audit->record($request, 'auth.password_reset_requested');

        return response()->json(['data' => [
            'message' => 'If an account matches that email, password reset instructions will be sent.',
        ]]);
    }

    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $credentials = $request->safe()->only(['email', 'password', 'password_confirmation', 'token']);
        $resetUser = null;
        $status = Password::reset($credentials, function (User $user, string $password) use (&$resetUser): void {
            $user->forceFill([
                'password' => $password,
                'remember_token' => Str::random(60),
            ])->save();
            $resetUser = $user;
            event(new PasswordReset($user));
        });

        if ($status !== Password::PASSWORD_RESET || ! $resetUser instanceof User) {
            $this->audit->record($request, 'auth.password_reset_failed');

            return response()->json(['error' => [
                'code' => 'PASSWORD_RESET_INVALID',
                'message' => 'The password reset link is invalid or expired.',
                'fields' => (object) [],
            ]], 422);
        }

        $this->revokeSessions($resetUser);
        $this->audit->record($request, 'auth.password_reset_succeeded', $resetUser, 'user', (string) $resetUser->getKey());

        return response()->json(['data' => ['passwordReset' => true]]);
    }

    private function revokeSessions(User $user): void
    {
        DB::table((string) config('session.table'))->where('user_id', $user->getKey())->delete();
        MobileSession::query()->whereBelongsTo($user)->whereNull('revoked_at')->each(
            fn (MobileSession $session) => $this->mobileTokens->revoke($session, 'password_reset'),
        );
    }
}
