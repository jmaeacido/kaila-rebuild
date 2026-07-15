<?php

namespace Tests\Feature\Security;

use Tests\TestCase;

class CorsPolicyTest extends TestCase
{
    public function test_configured_first_party_origin_receives_credentialed_cors_headers(): void
    {
        $this->withHeaders([
            'Origin' => 'http://localhost:3000',
            'Access-Control-Request-Method' => 'POST',
        ])->options('/api/v1/auth/login')
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
            ->assertHeader('Access-Control-Allow-Credentials', 'true');
    }

    public function test_untrusted_origin_is_not_granted_cross_origin_access(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'https://attacker.example',
            'Access-Control-Request-Method' => 'POST',
        ])->options('/api/v1/auth/login');

        $this->assertFalse($response->headers->has('Access-Control-Allow-Origin'));
    }
}
