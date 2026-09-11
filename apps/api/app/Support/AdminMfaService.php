<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;

class AdminMfaService
{
    public const SESSION_VERIFIED_AT = 'identity_mfa_verified_at';

    public const SESSION_PENDING_SECRET = 'identity_mfa_pending_secret';

    public function __construct(private readonly TotpService $totp) {}

    public function isConfigured(User $user): bool
    {
        return $user->mfa_confirmed_at !== null && filled($user->mfa_secret);
    }

    public function isSessionVerified(Request $request): bool
    {
        $verifiedAt = $request->session()->get(self::SESSION_VERIFIED_AT);
        if (! is_numeric($verifiedAt) && ! is_string($verifiedAt)) {
            return false;
        }
        $expiresMinutes = (int) config('identity_verification.mfa_session_minutes', 60);

        return now()->timestamp - (int) $verifiedAt < ($expiresMinutes * 60);
    }

    public function markSessionVerified(Request $request): void
    {
        $request->session()->put(self::SESSION_VERIFIED_AT, now()->timestamp);
    }

    public function clearSession(Request $request): void
    {
        $request->session()->forget([self::SESSION_VERIFIED_AT, self::SESSION_PENDING_SECRET]);
    }

    public function beginSetup(User $user, Request $request): array
    {
        $secret = $this->totp->generateSecret();
        $request->session()->put(self::SESSION_PENDING_SECRET, $secret);

        return [
            'secret' => $secret,
            'otpauthUrl' => $this->totp->provisioningUri($secret, $user->email ?? (string) $user->id),
            'configured' => $this->isConfigured($user),
        ];
    }

    public function confirmSetup(User $user, Request $request, string $code): void
    {
        $secret = $request->session()->get(self::SESSION_PENDING_SECRET);
        abort_unless(is_string($secret) && $secret !== '', 422, 'Start MFA setup before confirming.');
        abort_unless($this->totp->verify($secret, $code), 422, 'The MFA code is invalid.');
        $recovery = [];
        for ($i = 0; $i < 8; $i++) {
            $recovery[] = strtoupper(bin2hex(random_bytes(4)));
        }
        $user->forceFill([
            'mfa_secret' => encrypt($secret),
            'mfa_confirmed_at' => now(),
            'mfa_recovery_codes' => array_map(fn (string $code): string => hash('sha256', $code), $recovery),
        ])->save();
        $request->session()->forget(self::SESSION_PENDING_SECRET);
        $this->markSessionVerified($request);
        $request->attributes->set('mfa_recovery_codes_plain', $recovery);
    }

    public function challenge(User $user, Request $request, string $code): void
    {
        abort_unless($this->isConfigured($user), 409, 'Configure MFA before reviewing identity evidence.');
        $secret = decrypt((string) $user->mfa_secret);
        $ok = $this->totp->verify($secret, $code);
        if (! $ok) {
            $codes = $user->mfa_recovery_codes ?? [];
            $hash = hash('sha256', strtoupper(preg_replace('/\s+/', '', $code) ?? ''));
            $remaining = [];
            foreach ($codes as $stored) {
                if (! $ok && hash_equals((string) $stored, $hash)) {
                    $ok = true;
                    continue;
                }
                $remaining[] = $stored;
            }
            if ($ok) {
                $user->forceFill(['mfa_recovery_codes' => $remaining])->save();
            }
        }
        abort_unless($ok, 422, 'The MFA code is invalid.');
        $this->markSessionVerified($request);
    }

    public function assertCanAccessIdentityEvidence(User $user, Request $request): void
    {
        abort_unless(StaffAuthorization::canAccessOperations($user), 403, 'Administrator access required.');
        abort_unless($this->isConfigured($user), 403, 'MFA must be configured before accessing identity evidence.');
        abort_unless($this->isSessionVerified($request), 403, 'MFA challenge required before accessing identity evidence.');
    }
}
