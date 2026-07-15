<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Str;
use RuntimeException;

class RealtimeTicketIssuer
{
    /** @return array{ticket: string, expiresAt: string} */
    public function issue(User $user, string $sessionId): array
    {
        $seed = base64_decode((string) config('realtime.ticket_signing_seed_base64'), true);
        if ($seed === false || strlen($seed) !== SODIUM_CRYPTO_SIGN_SEEDBYTES) {
            throw new RuntimeException('Realtime ticket signing is not configured.');
        }

        $issuedAt = now();
        $expiresAt = $issuedAt->copy()->addSeconds((int) config('realtime.ticket_ttl_seconds'));
        $header = ['alg' => 'EdDSA', 'typ' => 'JWT'];
        $claims = [
            'sub' => (string) $user->getKey(),
            'sessionId' => $sessionId,
            'aud' => (string) config('realtime.ticket_audience'),
            'iss' => (string) config('realtime.ticket_issuer'),
            'iat' => $issuedAt->getTimestamp(),
            'exp' => $expiresAt->getTimestamp(),
            'jti' => (string) Str::uuid(),
        ];
        $encodedHeader = $this->encode((string) json_encode($header, JSON_THROW_ON_ERROR));
        $encodedClaims = $this->encode((string) json_encode($claims, JSON_THROW_ON_ERROR));
        $signingInput = $encodedHeader.'.'.$encodedClaims;
        $keypair = sodium_crypto_sign_seed_keypair($seed);
        $signature = sodium_crypto_sign_detached($signingInput, sodium_crypto_sign_secretkey($keypair));

        return [
            'ticket' => $signingInput.'.'.$this->encode($signature),
            'expiresAt' => $expiresAt->toIso8601String(),
        ];
    }

    private function encode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
