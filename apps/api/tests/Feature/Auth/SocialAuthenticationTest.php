<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SocialAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.google.client_id', 'google-client');
        config()->set('services.google.client_secret', 'google-secret');
        config()->set('services.google.redirect_uri', 'http://localhost/api/v1/auth/social/google/callback');
        config()->set('services.kaila.public_url', 'https://kaila.example.test');
    }

    public function test_google_redirect_stores_state_and_uses_safe_destination(): void
    {
        $response = $this->get('/api/v1/auth/social/google/redirect?next=%2Fjobs');

        $response->assertRedirect();
        $location = (string) $response->headers->get('Location');
        $this->assertStringStartsWith('https://accounts.google.com/o/oauth2/v2/auth?', $location);
        parse_str((string) parse_url($location, PHP_URL_QUERY), $query);
        $this->assertSame('google-client', $query['client_id']);
        $this->assertNotEmpty($query['state']);
        $this->assertSame('/jobs', session("social_auth.{$query['state']}.next"));
    }

    public function test_verified_google_profile_creates_and_authenticates_account(): void
    {
        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'token']),
            'https://openidconnect.googleapis.com/v1/userinfo' => Http::response([
                'sub' => 'google-user-1',
                'name' => 'Juan Dela Cruz',
                'email' => 'JUAN@example.test',
                'email_verified' => true,
                'picture' => 'https://example.test/avatar.jpg',
            ]),
        ]);

        $state = $this->beginGoogle('/jobs', true);
        $this->get("/api/v1/auth/social/google/callback?state=$state&code=valid-code")
            ->assertRedirect('https://kaila.example.test/jobs');

        $user = User::query()->where('email', 'juan@example.test')->firstOrFail();
        $this->assertAuthenticatedAs($user);
        $this->assertSame('google', $user->auth_provider);
        $this->assertSame('google:google-user-1', $user->auth_subject);
        $this->assertTrue($user->provider_intent);
        $this->assertSame(config('policies.terms_version'), $user->terms_accepted_version);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'auth.social_login_succeeded']);
    }

    public function test_social_login_does_not_overwrite_a_different_social_identity(): void
    {
        $existing = User::factory()->create([
            'email' => 'juan@example.test',
            'auth_provider' => 'facebook',
            'auth_subject' => 'facebook:existing',
        ]);
        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'token']),
            'https://openidconnect.googleapis.com/v1/userinfo' => Http::response([
                'sub' => 'google-user-1',
                'name' => 'Juan',
                'email' => 'juan@example.test',
                'email_verified' => true,
            ]),
        ]);

        $state = $this->beginGoogle('/');
        $response = $this->get("/api/v1/auth/social/google/callback?state=$state&code=valid-code");

        $response->assertRedirectContains('socialError=');
        $this->assertGuest();
        $this->assertSame('facebook:existing', $existing->fresh()->auth_subject);
    }

    public function test_callback_rejects_missing_or_expired_state(): void
    {
        Http::fake();

        $this->get('/api/v1/auth/social/google/callback?state=unknown&code=valid-code')
            ->assertRedirectContains('socialError=');
        Http::assertNothingSent();
        $this->assertGuest();
    }

    private function beginGoogle(string $destination, bool $providerIntent = false): string
    {
        $response = $this->get('/api/v1/auth/social/google/redirect?'.http_build_query([
            'next' => $destination,
            'providerIntent' => $providerIntent ? '1' : '0',
        ]));
        parse_str((string) parse_url((string) $response->headers->get('Location'), PHP_URL_QUERY), $query);

        return (string) $query['state'];
    }
}
