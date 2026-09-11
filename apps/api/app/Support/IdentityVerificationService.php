<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class IdentityVerificationService
{
    public function approved(User $user): bool
    {
        $verification = $user->relationLoaded('identityVerification')
            ? $user->identityVerification
            : $user->identityVerification()->first();

        return $verification?->isApproved() === true;
    }

    public function captureAvailableFor(User $user): bool
    {
        if (! config('identity_verification.capture_enabled')) {
            return false;
        }

        $allowlistIds = config('identity_verification.allowlist_user_ids', []);
        $allowlistEmails = config('identity_verification.allowlist_emails', []);
        if ($allowlistIds !== [] || $allowlistEmails !== []) {
            $email = strtolower((string) $user->email);

            return in_array((int) $user->id, $allowlistIds, true) || in_array($email, $allowlistEmails, true);
        }

        $percent = max(0, min(100, (int) config('identity_verification.rollout_percent', 0)));
        if ($percent >= 100) {
            return true;
        }
        if ($percent <= 0) {
            return false;
        }

        return ((crc32((string) $user->id) % 100) + 100) % 100 < $percent;
    }

    public function assertCaptureReady(): void
    {
        abort_unless(config('identity_verification.capture_enabled'), 503, 'Identity verification is not available yet.');
        if (! config('identity_verification.fail_closed', true)) {
            return;
        }
        $disk = (string) config('identity_verification.disk');
        try {
            $probe = 'healthchecks/'.Str::uuid().'.probe';
            Storage::disk($disk)->put($probe, 'ok');
            $ok = Storage::disk($disk)->get($probe) === 'ok';
            Storage::disk($disk)->delete($probe);
            abort_unless($ok, 503, 'Identity evidence storage failed closed.');
        } catch (\Throwable) {
            abort(503, 'Identity evidence storage failed closed.');
        }
        if (app()->environment('production') && (string) config('media-scanning.driver') === 'fake') {
            abort(503, 'Identity verification cannot run with an unsafe malware scanner.');
        }
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
            'captureAvailable' => $this->captureAvailableFor($user),
            'enforcementEnabled' => (bool) config('identity_verification.enforcement_enabled'),
            'status' => $status,
            'identityVerified' => $verification?->isApproved() === true,
            'decisionReason' => $verification?->decision_reason,
            'submittedAt' => $verification?->submitted_at?->toIso8601String(),
            'reviewedAt' => $verification?->reviewed_at?->toIso8601String(),
            'verifiedUntil' => $verification?->verified_until?->toDateString(),
            'appealRequestedAt' => $verification?->appeal_requested_at?->toIso8601String(),
            'noticeVersion' => (string) config('identity_verification.notice_version'),
            'consentVersion' => (string) config('identity_verification.consent_version'),
            'privacyPolicyVersion' => (string) config('identity_verification.privacy_policy_version'),
            'purposeStatement' => (string) config('identity_verification.purpose_statement'),
        ];
    }
}
