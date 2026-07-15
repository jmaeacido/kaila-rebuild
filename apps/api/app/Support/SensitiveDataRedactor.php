<?php

namespace App\Support;

class SensitiveDataRedactor
{
    /** @var list<string> */
    private const SENSITIVE_KEYS = [
        'authorization', 'password', 'password_confirmation', 'token', 'access_token',
        'refresh_token', 'message', 'body', 'latitude', 'longitude', 'coordinates',
    ];

    /** @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function redact(array $context): array
    {
        foreach ($context as $key => $value) {
            if (in_array(strtolower($key), self::SENSITIVE_KEYS, true)) {
                $context[$key] = '[REDACTED]';
            } elseif (is_array($value)) {
                /** @var array<string, mixed> $value */
                $context[$key] = $this->redact($value);
            }
        }

        return $context;
    }
}
