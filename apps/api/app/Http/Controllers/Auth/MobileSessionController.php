<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\MobileLoginRequest;
use App\Http\Requests\Auth\MobileRefreshRequest;
use App\Http\Resources\CurrentUserResource;
use App\Models\MobileSession;
use App\Models\User;
use App\Support\AuditRecorder;
use App\Support\MobileTokenManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class MobileSessionController extends Controller
{
    public function __construct(
        private readonly MobileTokenManager $tokens,
        private readonly AuditRecorder $audit,
    ) {}

    public function store(MobileLoginRequest $request): JsonResponse
    {
        $user = User::query()->where('email', $request->string('email'))->first();
        if (! $user || ! Hash::check($request->string('password')->toString(), $user->password)) {
            $this->audit->record($request, 'auth.mobile_login_failed');

            return $this->unauthorized('The email or password is incorrect.', 422);
        }

        $tokens = $this->tokens->createSession($user, $request->string('deviceName')->toString());
        $this->audit->record($request, 'auth.mobile_login_succeeded', $user, 'mobile_session', $tokens['sessionId']);

        return response()->json(['data' => ['user' => new CurrentUserResource($user), 'tokens' => $tokens]]);
    }

    public function refresh(MobileRefreshRequest $request): JsonResponse
    {
        $result = $this->tokens->rotate($request->string('refreshToken')->toString());
        if ($result['status'] !== 'ok') {
            if ($result['status'] === 'reused' && $result['session']) {
                $session = $result['session'];
                $this->audit->record($request, 'auth.mobile_refresh_reuse_detected', $session->user()->first(), 'mobile_session', (string) $session->getKey());
            }

            return $this->unauthorized('The refresh token is invalid or expired.');
        }

        return response()->json(['data' => ['tokens' => $result['tokens']]]);
    }

    public function me(Request $request): CurrentUserResource
    {
        /** @var User $user */
        $user = $request->user();

        return new CurrentUserResource($user);
    }

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $current = $this->currentSession($request);
        $sessions = MobileSession::query()->whereBelongsTo($user)->whereNull('revoked_at')->latest('last_used_at')->get();

        return response()->json(['data' => $sessions->map(fn (MobileSession $session) => [
            'id' => (string) $session->getKey(),
            'deviceName' => $session->device_name,
            'lastUsedAt' => $session->last_used_at?->toIso8601String(),
            'isCurrent' => $session->is($current),
        ])]);
    }

    public function destroy(Request $request, string $sessionId): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $session = MobileSession::query()->whereBelongsTo($user)->findOrFail($sessionId);
        $this->tokens->revoke($session, 'user_revoked');
        $this->audit->record($request, 'auth.mobile_session_revoked', $user, 'mobile_session', $sessionId);

        return response()->json(['data' => ['revoked' => true]]);
    }

    public function destroyCurrent(Request $request): JsonResponse
    {
        $session = $this->currentSession($request);
        $this->tokens->revoke($session, 'logout');

        return response()->json(['data' => ['loggedOut' => true]]);
    }

    private function currentSession(Request $request): MobileSession
    {
        /** @var MobileSession $session */
        $session = $request->attributes->get('mobileSession');

        return $session;
    }

    private function unauthorized(string $message, int $status = 401): JsonResponse
    {
        return response()->json(['error' => [
            'code' => 'AUTHENTICATION_FAILED',
            'message' => $message,
            'fields' => (object) [],
        ]], $status);
    }
}
