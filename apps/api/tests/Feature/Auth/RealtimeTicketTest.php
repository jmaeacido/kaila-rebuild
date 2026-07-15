<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RealtimeTicketTest extends TestCase
{
    use RefreshDatabase;

    private string $seed;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed = str_repeat('k', SODIUM_CRYPTO_SIGN_SEEDBYTES);
        config()->set('realtime.ticket_signing_seed_base64', base64_encode($this->seed));
        config()->set('realtime.ticket_ttl_seconds', 60);
    }

    public function test_browser_session_can_request_a_short_lived_signed_ticket(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->postJson('/api/v1/realtime/ticket')->assertOk();
        $claims = $this->verifyAndDecode($response->json('data.ticket'));

        $this->assertSame((string) $user->getKey(), $claims['sub']);
        $this->assertSame('kaila-realtime', $claims['aud']);
        $this->assertSame('kaila-api', $claims['iss']);
        $this->assertSame(60, $claims['exp'] - $claims['iat']);
        $this->assertSame($this->app['session']->driver()->getId(), $claims['sessionId']);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'realtime.ticket_issued']);
    }

    public function test_mobile_ticket_is_bound_to_the_authenticated_mobile_session(): void
    {
        $user = User::factory()->create();
        $tokens = $this->postJson('/api/v1/auth/mobile/login', [
            'email' => $user->email,
            'password' => 'password',
            'deviceName' => 'Android test device',
        ])->assertOk()->json('data.tokens');

        $ticket = $this->withToken($tokens['accessToken'])
            ->postJson('/api/v1/auth/mobile/realtime-ticket')
            ->assertOk()->json('data.ticket');
        $claims = $this->verifyAndDecode($ticket);

        $this->assertSame($tokens['sessionId'], $claims['sessionId']);
        $this->assertSame((string) $user->getKey(), $claims['sub']);
    }

    public function test_unauthenticated_and_forged_access_tokens_cannot_request_tickets(): void
    {
        $this->postJson('/api/v1/realtime/ticket')->assertUnauthorized();
        $this->withToken('kaila_at_forged')->postJson('/api/v1/auth/mobile/realtime-ticket')->assertUnauthorized();
    }

    /** @return array{sub: string, sessionId: string, aud: string, iss: string, iat: int, exp: int, jti: string} */
    private function verifyAndDecode(string $ticket): array
    {
        [$header, $payload, $signature] = explode('.', $ticket);
        $keypair = sodium_crypto_sign_seed_keypair($this->seed);
        $this->assertTrue(sodium_crypto_sign_verify_detached(
            $this->decode($signature),
            $header.'.'.$payload,
            sodium_crypto_sign_publickey($keypair),
        ));

        return json_decode($this->decode($payload), true, flags: JSON_THROW_ON_ERROR);
    }

    private function decode(string $value): string
    {
        return (string) base64_decode(strtr($value, '-_', '+/'), true);
    }
}
