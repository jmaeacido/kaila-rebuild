<?php

namespace App\Support;

use Illuminate\Support\Facades\Crypt;
use RuntimeException;

class IdentityEvidenceCipher
{
    public function encrypt(string $bytes): string
    {
        return Crypt::encryptString($bytes);
    }

    public function decrypt(string $payload): string
    {
        try {
            return Crypt::decryptString($payload);
        } catch (\Throwable $exception) {
            throw new RuntimeException('Identity evidence could not be decrypted.', 0, $exception);
        }
    }
}
