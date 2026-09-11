<?php

namespace App\Support;

class SensitiveDataRedactor
{
    /** @var list<string> */
    private const SENSITIVE_KEYS = [
        'authorization', 'password', 'password_confirmation', 'token', 'access_token',
        'refresh_token', 'message', 'body', 'latitude', 'longitude', 'coordinates',
        'idfront', 'id_front', 'idback', 'id_back', 'selfie', 'uploadtoken', 'upload_token',
        'object_key', 'objectkey', 'sha256', 'id_number', 'idnumber', 'document_number',
        'documentnumber', 'birth_date', 'birthdate', 'date_of_birth', 'dateofbirth',
        'signed_url', 'signedurl', 'presigned_url', 'presignedurl',
        'preview_url', 'previewurl', 'raw_body', 'request_body', 'payload', 'file_contents', 'image_data',
        'mfa_secret', 'mfasecret', 'otpauth_url', 'otpauthurl',
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
