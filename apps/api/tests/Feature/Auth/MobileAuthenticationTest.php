<?php

namespace Tests\Feature\Auth;

use App\Models\MobileSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MobileAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_mobile_login_issues_hashed_opaque_tokens_and_bearer_access(): void
    {
        $user = User::factory()->create(['email' => 'mobile@example.test']);
        $tokens = $this->login($user, 'Pixel 8');

        $this->assertStringStartsWith('kaila_at_', $tokens['accessToken']);
        $this->assertStringStartsWith('kaila_rt_', $tokens['refreshToken']);
        $this->assertDatabaseHas('mobile_access_tokens', ['token_hash' => hash('sha256', $tokens['accessToken'])]);
        $this->assertDatabaseMissing('mobile_access_tokens', ['token_hash' => $tokens['accessToken']]);

        $this->withToken($tokens['accessToken'])
            ->getJson('/api/v1/auth/mobile/me')
            ->assertOk()
            ->assertJsonPath('data.id', (string) $user->getKey());
    }

    public function test_refresh_token_is_single_use_and_rotates_both_tokens(): void
    {
        $user = User::factory()->create();
        $old = $this->login($user);

        $response = $this->postJson('/api/v1/auth/mobile/refresh', ['refreshToken' => $old['refreshToken']])
            ->assertOk();
        $new = $response->json('data.tokens');

        $this->assertNotSame($old['accessToken'], $new['accessToken']);
        $this->assertNotSame($old['refreshToken'], $new['refreshToken']);
        $this->withToken($old['accessToken'])->getJson('/api/v1/auth/mobile/me')->assertUnauthorized();
        $this->withToken($new['accessToken'])->getJson('/api/v1/auth/mobile/me')->assertOk();
    }

    public function test_refresh_token_reuse_revokes_the_whole_session_family(): void
    {
        $user = User::factory()->create();
        $old = $this->login($user);
        $new = $this->postJson('/api/v1/auth/mobile/refresh', ['refreshToken' => $old['refreshToken']])
            ->assertOk()->json('data.tokens');

        $this->postJson('/api/v1/auth/mobile/refresh', ['refreshToken' => $old['refreshToken']])
            ->assertUnauthorized();

        $this->withToken($new['accessToken'])->getJson('/api/v1/auth/mobile/me')->assertUnauthorized();
        $this->assertDatabaseHas('mobile_sessions', [
            'id' => $old['sessionId'],
            'revoke_reason' => 'refresh_token_reuse',
        ]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'auth.mobile_refresh_reuse_detected']);
    }

    public function test_expired_access_and_refresh_tokens_are_rejected(): void
    {
        config()->set('mobile_auth.access_token_ttl_minutes', 1);
        config()->set('mobile_auth.refresh_token_ttl_days', 1);
        $tokens = $this->login(User::factory()->create());

        $this->travel(2)->minutes();
        $this->withToken($tokens['accessToken'])->getJson('/api/v1/auth/mobile/me')->assertUnauthorized();

        $this->travel(1)->days();
        $this->postJson('/api/v1/auth/mobile/refresh', ['refreshToken' => $tokens['refreshToken']])
            ->assertUnauthorized();
    }

    public function test_user_cannot_revoke_another_users_mobile_session(): void
    {
        $first = User::factory()->create();
        $second = User::factory()->create();
        $firstTokens = $this->login($first, 'First phone');
        $secondTokens = $this->login($second, 'Second phone');

        $this->withToken($firstTokens['accessToken'])
            ->deleteJson('/api/v1/auth/mobile/sessions/'.$secondTokens['sessionId'])
            ->assertNotFound();

        $this->assertNull(MobileSession::query()->findOrFail($secondTokens['sessionId'])->revoked_at);
        $this->withToken($secondTokens['accessToken'])->getJson('/api/v1/auth/mobile/me')->assertOk();
    }

    /** @return array{accessToken: string, refreshToken: string, tokenType: string, accessExpiresAt: string, refreshExpiresAt: string, sessionId: string} */
    private function login(User $user, string $deviceName = 'Test phone'): array
    {
        return $this->postJson('/api/v1/auth/mobile/login', [
            'email' => $user->email,
            'password' => 'password',
            'deviceName' => $deviceName,
        ])->assertOk()->json('data.tokens');
    }
}
