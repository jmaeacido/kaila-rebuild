<?php

namespace Tests\Unit;

use App\Support\SensitiveDataRedactor;
use PHPUnit\Framework\TestCase;

class SensitiveDataRedactorTest extends TestCase
{
    public function test_sensitive_values_are_redacted_recursively(): void
    {
        $redacted = (new SensitiveDataRedactor)->redact([
            'request_id' => 'safe-id',
            'password' => 'secret',
            'nested' => [
                'authorization' => 'Bearer token',
                'coordinates' => ['14.5', '121.0'],
            ],
        ]);

        $this->assertSame('safe-id', $redacted['request_id']);
        $this->assertSame('[REDACTED]', $redacted['password']);
        $this->assertSame('[REDACTED]', $redacted['nested']['authorization']);
        $this->assertSame('[REDACTED]', $redacted['nested']['coordinates']);
    }

    public function test_identity_evidence_keys_are_redacted(): void
    {
        $redacted = (new SensitiveDataRedactor)->redact([
            'idFront' => 'binary',
            'selfie' => 'binary',
            'object_key' => 'quarantine/abc.jpg',
            'sha256' => 'abc',
            'uploadToken' => 'secret',
            'status' => 'submitted',
        ]);

        $this->assertSame('[REDACTED]', $redacted['idFront']);
        $this->assertSame('[REDACTED]', $redacted['selfie']);
        $this->assertSame('[REDACTED]', $redacted['object_key']);
        $this->assertSame('[REDACTED]', $redacted['sha256']);
        $this->assertSame('[REDACTED]', $redacted['uploadToken']);
        $this->assertSame('submitted', $redacted['status']);
    }
}
