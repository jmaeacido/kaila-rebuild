<?php

namespace App\Support;

use App\Models\MobileAccessToken;
use App\Models\MobileRefreshToken;
use App\Models\MobileSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class MobileTokenManager
{
    /** @return array{accessToken: string, refreshToken: string, tokenType: string, accessExpiresAt: string, refreshExpiresAt: string, sessionId: string} */
    public function createSession(User $user, string $deviceName): array
    {
        return DB::transaction(function () use ($user, $deviceName): array {
            $session = MobileSession::query()->create([
                'user_id' => $user->getKey(),
                'device_name' => $deviceName,
                'last_used_at' => now(),
            ]);

            return $this->issuePair($session);
        });
    }

    /** @return array{status: 'ok', tokens: array{accessToken: string, refreshToken: string, tokenType: string, accessExpiresAt: string, refreshExpiresAt: string, sessionId: string}}|array{status: 'invalid'|'reused', session: MobileSession|null} */
    public function rotate(string $plainRefreshToken): array
    {
        return DB::transaction(function () use ($plainRefreshToken): array {
            $refresh = MobileRefreshToken::query()
                ->where('token_hash', $this->hash($plainRefreshToken))
                ->lockForUpdate()
                ->first();

            if (! $refresh) {
                return ['status' => 'invalid', 'session' => null];
            }

            $session = MobileSession::query()->lockForUpdate()->find($refresh->mobile_session_id);
            if (! $session || $session->revoked_at || $refresh->expires_at->isPast()) {
                return ['status' => 'invalid', 'session' => $session];
            }

            if ($refresh->consumed_at) {
                $this->revoke($session, 'refresh_token_reuse');

                return ['status' => 'reused', 'session' => $session];
            }

            $refresh->forceFill(['consumed_at' => now()])->save();
            $session->accessTokens()->whereNull('revoked_at')->update(['revoked_at' => now()]);
            $tokens = $this->issuePair($session, $refresh);

            return ['status' => 'ok', 'tokens' => $tokens];
        });
    }

    public function revoke(MobileSession $session, string $reason): void
    {
        $now = now();
        $session->forceFill(['revoked_at' => $now, 'revoke_reason' => $reason])->save();
        $session->accessTokens()->whereNull('revoked_at')->update(['revoked_at' => $now]);
    }

    /** @return array{accessToken: string, refreshToken: string, tokenType: string, accessExpiresAt: string, refreshExpiresAt: string, sessionId: string} */
    private function issuePair(MobileSession $session, ?MobileRefreshToken $replaces = null): array
    {
        $accessToken = $this->randomToken('kaila_at_');
        $refreshToken = $this->randomToken('kaila_rt_');
        $accessExpiresAt = now()->addMinutes((int) config('mobile_auth.access_token_ttl_minutes'));
        $refreshExpiresAt = now()->addDays((int) config('mobile_auth.refresh_token_ttl_days'));

        MobileAccessToken::query()->create([
            'mobile_session_id' => $session->getKey(),
            'token_hash' => $this->hash($accessToken),
            'expires_at' => $accessExpiresAt,
        ]);
        $newRefresh = MobileRefreshToken::query()->create([
            'mobile_session_id' => $session->getKey(),
            'token_hash' => $this->hash($refreshToken),
            'expires_at' => $refreshExpiresAt,
        ]);
        if ($replaces) {
            $replaces->forceFill(['replaced_by_id' => $newRefresh->getKey()])->save();
        }
        $session->forceFill(['last_used_at' => now()])->save();

        return [
            'accessToken' => $accessToken,
            'refreshToken' => $refreshToken,
            'tokenType' => 'Bearer',
            'accessExpiresAt' => $accessExpiresAt->toIso8601String(),
            'refreshExpiresAt' => $refreshExpiresAt->toIso8601String(),
            'sessionId' => (string) $session->getKey(),
        ];
    }

    private function randomToken(string $prefix): string
    {
        return $prefix.rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    }

    private function hash(string $token): string
    {
        return hash('sha256', $token);
    }
}
