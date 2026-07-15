<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\CurrentUserResource;
use App\Models\MobileSession;
use App\Models\User;
use App\Support\AuditRecorder;
use App\Support\MobileTokenManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AuthenticatedSessionController extends Controller
{
    public function __construct(
        private readonly AuditRecorder $audit,
        private readonly MobileTokenManager $mobileTokens,
    ) {}

    public function store(LoginRequest $request): JsonResponse
    {
        $credentials = $request->safe()->only(['email', 'password']);

        if (! Auth::attempt($credentials)) {
            $this->audit->record($request, 'auth.login_failed');

            return response()->json([
                'error' => [
                    'code' => 'AUTHENTICATION_FAILED',
                    'message' => 'The email or password is incorrect.',
                    'fields' => (object) [],
                ],
            ], 422);
        }

        $request->session()->regenerate();
        /** @var User $user */
        $user = $request->user();
        $this->audit->record($request, 'auth.login_succeeded', $user, 'user', (string) $user->getKey());

        return (new CurrentUserResource($user))->response();
    }

    public function destroy(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->audit->record($request, 'auth.logout', $user, 'user', (string) $user->getKey());

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['data' => ['loggedOut' => true]]);
    }

    public function destroyAll(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->audit->record($request, 'auth.logout_all', $user, 'user', (string) $user->getKey());

        DB::table((string) config('session.table'))
            ->where('user_id', $user->getKey())
            ->delete();

        MobileSession::query()->whereBelongsTo($user)->whereNull('revoked_at')->each(
            fn (MobileSession $session) => $this->mobileTokens->revoke($session, 'logout_all'),
        );

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['data' => ['loggedOut' => true]]);
    }
}
