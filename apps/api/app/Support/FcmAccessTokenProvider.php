<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use JsonException;
use RuntimeException;

class FcmAccessTokenProvider
{
    public function token(): string
    {
        $configuredToken = (string) config('services.fcm.access_token');
        if ($configuredToken !== '') {
            return $configuredToken;
        }

        $credentials = $this->credentials();
        $cacheKey = 'fcm.oauth-token.'.hash('sha256', $credentials['client_email']);

        return Cache::remember($cacheKey, now()->addMinutes(50), function () use ($credentials): string {
            $response = Http::asForm()->timeout(10)->post($credentials['token_uri'], [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $this->assertion($credentials),
            ]);

            if (! $response->successful() || ! is_string($response->json('access_token'))) {
                throw new RuntimeException("FCM OAuth token request failed with status {$response->status()}.");
            }

            return (string) $response->json('access_token');
        });
    }

    /** @return array{client_email: string, private_key: string, token_uri: string, project_id: string} */
    public function credentials(): array
    {
        $path = (string) config('services.fcm.service_account_path');
        if ($path === '' || ! is_readable($path)) {
            throw new RuntimeException('FCM service-account credentials are not configured.');
        }

        try {
            $decoded = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException('FCM service-account credentials are invalid JSON.', previous: $exception);
        }

        foreach (['client_email', 'private_key', 'project_id'] as $key) {
            if (! is_string($decoded[$key] ?? null) || $decoded[$key] === '') {
                throw new RuntimeException("FCM service-account credential {$key} is missing.");
            }
        }

        $tokenUri = $decoded['token_uri'] ?? 'https://oauth2.googleapis.com/token';
        if (! is_string($tokenUri) || ! str_starts_with($tokenUri, 'https://')) {
            throw new RuntimeException('FCM service-account token URI is invalid.');
        }

        return [
            'client_email' => $decoded['client_email'],
            'private_key' => $decoded['private_key'],
            'project_id' => $decoded['project_id'],
            'token_uri' => $tokenUri,
        ];
    }

    /** @param array{client_email: string, private_key: string, token_uri: string, project_id: string} $credentials */
    private function assertion(array $credentials): string
    {
        $now = time();
        $header = $this->base64Url(json_encode(['alg' => 'RS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
        $claims = $this->base64Url(json_encode([
            'iss' => $credentials['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => $credentials['token_uri'],
            'iat' => $now,
            'exp' => $now + 3600,
        ], JSON_THROW_ON_ERROR));
        $payload = $header.'.'.$claims;

        if (! openssl_sign($payload, $signature, $credentials['private_key'], OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('FCM service-account assertion could not be signed.');
        }

        return $payload.'.'.$this->base64Url($signature);
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
