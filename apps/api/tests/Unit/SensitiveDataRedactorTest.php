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
}
