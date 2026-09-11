<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\AdminMfaService;
use App\Support\AuditRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminMfaController extends Controller
{
    public function __construct(
        private readonly AdminMfaService $mfa,
        private readonly AuditRecorder $audit,
    ) {}

    public function status(Request $request): JsonResponse
    {
        $user = $this->user($request);

        return response()->json([
            'data' => [
                'configured' => $this->mfa->isConfigured($user),
                'sessionVerified' => $this->mfa->isSessionVerified($request),
                'requiredForIdentityEvidence' => true,
            ],
        ]);
    }

    public function beginSetup(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $setup = $this->mfa->beginSetup($user, $request);
        $this->audit->record($request, 'admin.mfa.setup_started', $user, 'user', (string) $user->id);

        return response()->json(['data' => $setup]);
    }

    public function confirmSetup(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string']]);
        $user = $this->user($request);
        $this->mfa->confirmSetup($user, $request, $data['code']);
        $this->audit->record($request, 'admin.mfa.setup_confirmed', $user, 'user', (string) $user->id);
        $recovery = $request->attributes->get('mfa_recovery_codes_plain', []);

        return response()->json([
            'data' => [
                'configured' => true,
                'sessionVerified' => true,
                'recoveryCodes' => $recovery,
            ],
        ]);
    }

    public function challenge(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string']]);
        $user = $this->user($request);
        $this->mfa->challenge($user, $request, $data['code']);
        $this->audit->record($request, 'admin.mfa.challenge_passed', $user, 'user', (string) $user->id);

        return response()->json(['data' => ['sessionVerified' => true]]);
    }

    private function user(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
