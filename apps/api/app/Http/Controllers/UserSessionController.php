<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\AuditRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserSessionController extends Controller
{
    public function __construct(private readonly AuditRecorder $audit) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user instanceof User) {
            abort(401);
        }

        $sessions = DB::table((string) config('session.table'))
            ->where('user_id', $user->getAuthIdentifier())
            ->orderByDesc('last_activity')
            ->get(['id', 'ip_address', 'user_agent', 'last_activity'])
            ->map(fn (object $session) => [
                'id' => $session->id,
                'ipAddress' => $session->ip_address,
                'userAgent' => $session->user_agent,
                'lastActiveAt' => now()->setTimestamp($session->last_activity)->toIso8601String(),
                'current' => hash_equals($request->session()->getId(), $session->id),
            ]);

        return response()->json(['data' => $sessions]);
    }

    public function destroy(Request $request, string $sessionId): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $deleted = DB::table((string) config('session.table'))
            ->where('id', $sessionId)
            ->where('user_id', $user->getKey())
            ->delete();

        if ($deleted === 0) {
            return response()->json([
                'error' => [
                    'code' => 'SESSION_NOT_FOUND',
                    'message' => 'The session was not found.',
                    'fields' => (object) [],
                ],
            ], 404);
        }

        $this->audit->record(
            $request,
            'auth.session_revoked',
            $user,
            'session',
            hash('sha256', $sessionId),
        );

        return response()->json(['data' => ['revoked' => true]]);
    }
}
