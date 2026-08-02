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
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

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
        $requiresPassword = $this->requiresPassword($user);

        return response()->json(['data' => [
            'eligible' => $blockers === [],
            'blockers' => $blockers,
            'requiresPassword' => $requiresPassword,
            'authProvider' => $user->auth_provider,
            'email' => $user->email,
            'confirmationPhrase' => 'DELETE',
        ]]);
    }

    public function verifyPassword(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        if (! $this->requiresPassword($user)) {
            return response()->json([
                'error' => [
                    'code' => 'PASSWORD_NOT_USED',
                    'message' => 'This account signs in with Google. Confirm with your email address instead.',
                    'fields' => (object) [],
                ],
            ], 422);
        }

        $data = $request->validate([
            'currentPassword' => ['required', 'string', 'min:8', 'max:255'],
        ]);
        $valid = Hash::check($data['currentPassword'], $user->password);

        return response()->json(['data' => ['valid' => $valid]]);
    }

    public function destroy(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $requiresPassword = $this->requiresPassword($user);

        $data = $request->validate([
            'currentPassword' => [Rule::requiredIf($requiresPassword), 'nullable', 'string', 'min:8', 'max:255'],
            'emailConfirmation' => [Rule::requiredIf(! $requiresPassword), 'nullable', 'string', 'max:255'],
            'confirmation' => ['required', 'string', 'in:DELETE'],
        ]);

        if ($requiresPassword) {
            if (! Hash::check((string) $data['currentPassword'], $user->password)) {
                return response()->json(['error' => ['code' => 'PASSWORD_INCORRECT', 'message' => 'Your password is incorrect.', 'fields' => ['currentPassword' => ['Enter your current password.']]]], 422);
            }
        } elseif (! hash_equals(Str::lower($user->email), Str::lower((string) $data['emailConfirmation']))) {
            return response()->json(['error' => ['code' => 'EMAIL_MISMATCH', 'message' => 'Enter the email address for this Google account.', 'fields' => ['emailConfirmation' => ['Type your Google account email exactly.']]]], 422);
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

    private function requiresPassword(User $user): bool
    {
        return $user->auth_provider === null || $user->auth_provider === '';
    }
}
