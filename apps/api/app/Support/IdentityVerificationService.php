<?php

namespace App\Support;

use App\Models\User;

class IdentityVerificationService
{
    public function approved(User $user): bool
    {
        $verification = $user->relationLoaded('identityVerification')
            ? $user->identityVerification
            : $user->identityVerification()->first();

        return $verification?->isApproved() === true;
    }

    public function enforce(User $user, string $action): void
    {
        if (! config('identity_verification.enforcement_enabled')) {
            return;
        }

        abort_unless($this->approved($user), 409, match ($action) {
            'post_job' => 'Verify your identity before posting your first job.',
            default => 'Verify your identity before activating provider mode.',
        });
    }

    /** @return array<string, mixed> */
    public function status(User $user): array
    {
        $verification = $user->identityVerification()->first();
        $status = $verification === null ? 'not_started' : $verification->status;
        if ($verification?->status === 'approved' && ! $verification->isApproved()) {
            $status = 'expired';
        }

        return [
            'captureAvailable' => (bool) config('identity_verification.capture_enabled'),
            'enforcementEnabled' => (bool) config('identity_verification.enforcement_enabled'),
            'status' => $status,
            'identityVerified' => $verification?->isApproved() === true,
            'decisionReason' => $verification?->decision_reason,
            'submittedAt' => $verification?->submitted_at?->toIso8601String(),
            'reviewedAt' => $verification?->reviewed_at?->toIso8601String(),
            'verifiedUntil' => $verification?->verified_until?->toDateString(),
            'appealRequestedAt' => $verification?->appeal_requested_at?->toIso8601String(),
        ];
    }
}
