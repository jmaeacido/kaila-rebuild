<?php

namespace App\Http\Controllers;

use App\Models\AccountDeletionRecord;
use App\Models\User;
use App\Support\AccountDeletionService;
use App\Support\AuditRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AccountDeletionController extends Controller
{
    public function __construct(
        private readonly AccountDeletionService $deletion,
        private readonly AuditRecorder $audit,
    ) {}

    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $blockers = $this->deletion->blockers($user);

        return response()->json(['data' => [
            'eligible' => $blockers === [],
            'blockers' => $blockers,
            'requiresPassword' => true,
            'confirmationPhrase' => 'DELETE',
        ]]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'currentPassword' => ['required', 'string', 'max:255'],
            'confirmation' => ['required', 'string', 'in:DELETE'],
        ]);
        /** @var User $user */
        $user = $request->user();

        if (! Hash::check($data['currentPassword'], $user->password)) {
            return response()->json(['error' => ['code' => 'PASSWORD_INCORRECT', 'message' => 'Your password is incorrect.', 'fields' => ['currentPassword' => ['Enter your current password.']]]], 422);
        }
        $blockers = $this->deletion->blockers($user);
        if ($blockers !== []) {
            AccountDeletionRecord::query()->create([
                'user_id' => $user->id,
                'outcome' => 'blocked',
                'blockers' => $blockers,
                'identity_hash' => hash_hmac('sha256', strtolower($user->email), (string) config('app.key')),
            ]);

            return response()->json(['error' => ['code' => 'DELETION_BLOCKED', 'message' => 'Resolve the listed items before deleting your account.', 'fields' => (object) []], 'data' => ['blockers' => $blockers]], 409);
        }

        $result = $this->deletion->delete($user);
        $this->audit->record($request, 'account.deleted', $user, 'account_deletion_record', $result['recordId']);
        Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['data' => $result]);
    }
}
