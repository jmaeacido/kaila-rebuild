<?php

namespace App\Support;

use RuntimeException;

/** RFC 6238 TOTP (SHA-1, 30s, 6 digits) without an external MFA package. */
class TotpService
{
    public function generateSecret(int $bytes = 20): string
    {
        if ($bytes < 1) {
            throw new RuntimeException('Secret length must be at least 1 byte.');
        }

        return $this->base32Encode(random_bytes($bytes));
    }

    public function verify(string $secret, string $code, int $window = 1): bool
    {
        $code = preg_replace('/\s+/', '', $code) ?? '';
        if (! preg_match('/^\d{6}$/', $code)) {
            return false;
        }
        $timeSlice = (int) floor(time() / 30);
        for ($i = -$window; $i <= $window; $i++) {
            if (hash_equals($this->codeAt($secret, $timeSlice + $i), $code)) {
                return true;
            }
        }

        return false;
    }

    public function provisioningUri(string $secret, string $accountName, string $issuer = 'KAILA Admin'): string
    {
        $label = rawurlencode($issuer.':'.$accountName);
        $query = http_build_query([
            'secret' => $secret,
            'issuer' => $issuer,
            'algorithm' => 'SHA1',
            'digits' => 6,
            'period' => 30,
        ], '', '&', PHP_QUERY_RFC3986);

        return "otpauth://totp/{$label}?{$query}";
    }

    public function codeAt(string $secret, int $timeSlice): string
    {
        $key = $this->base32Decode($secret);
        $time = pack('N*', 0, $timeSlice);
        $hash = hash_hmac('sha1', $time, $key, true);
        $offset = ord($hash[19]) & 0x0F;
        $value = (
            ((ord($hash[$offset]) & 0x7F) << 24)
            | ((ord($hash[$offset + 1]) & 0xFF) << 16)
            | ((ord($hash[$offset + 2]) & 0xFF) << 8)
            | (ord($hash[$offset + 3]) & 0xFF)
        ) % 1_000_000;

        return str_pad((string) $value, 6, '0', STR_PAD_LEFT);
    }

    private function base32Encode(string $data): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $bits = '';
        foreach (str_split($data) as $char) {
            $bits .= str_pad(decbin(ord($char)), 8, '0', STR_PAD_LEFT);
        }
        $output = '';
        foreach (str_split($bits, 5) as $chunk) {
            if (strlen($chunk) < 5) {
                $chunk = str_pad($chunk, 5, '0', STR_PAD_RIGHT);
            }
            $output .= $alphabet[$this->bitStringToInt($chunk)];
        }

        return $output;
    }

    private function base32Decode(string $secret): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = strtoupper(preg_replace('/[^A-Z2-7]/', '', $secret) ?? '');
        if ($secret === '') {
            throw new RuntimeException('Invalid MFA secret.');
        }
        $bits = '';
        foreach (str_split($secret) as $char) {
            $index = strpos($alphabet, $char);
            if ($index === false) {
                throw new RuntimeException('Invalid MFA secret.');
            }
            $bits .= str_pad(decbin($index), 5, '0', STR_PAD_LEFT);
        }
        $output = '';
        foreach (str_split($bits, 8) as $chunk) {
            if (strlen($chunk) === 8) {
                $output .= chr($this->bitStringToInt($chunk));
            }
        }

        return $output;
    }

    /** Convert a binary digit string (length 1–8) to an int without float intermediate. */
    private function bitStringToInt(string $bits): int
    {
        $value = 0;
        $length = strlen($bits);
        for ($i = 0; $i < $length; $i++) {
            $value = ($value << 1) | ($bits[$i] === '1' ? 1 : 0);
        }

        return $value;
    }
}
