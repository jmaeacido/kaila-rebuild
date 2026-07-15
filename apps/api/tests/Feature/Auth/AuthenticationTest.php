<?php

namespace Tests\Feature\Auth;

use App\Models\AuditEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_with_current_policy_versions(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.test',
            'password' => 'a-secure-password',
            'password_confirmation' => 'a-secure-password',
            'termsVersion' => config('policies.terms_version'),
            'privacyVersion' => config('policies.privacy_version'),
            'providerIntent' => true,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.email', 'juan@example.test')
            ->assertJsonPath('data.modes.0', 'client')
            ->assertJsonPath('data.modes.1', 'provider')
            ->assertJsonPath('data.providerEligible', false);

        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', [
            'email' => 'juan@example.test',
            'terms_accepted_version' => config('policies.terms_version'),
            'privacy_accepted_version' => config('policies.privacy_version'),
        ]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'auth.registered']);
    }

    public function test_registration_rejects_stale_policy_versions(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.test',
            'password' => 'a-secure-password',
            'password_confirmation' => 'a-secure-password',
            'termsVersion' => 'outdated',
            'privacyVersion' => config('policies.privacy_version'),
        ])->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonPath('error.fields.termsVersion.0', 'The selected terms version is invalid.');
    }

    public function test_user_can_login_and_session_identifier_is_regenerated(): void
    {
        $user = User::factory()->create([
            'email' => 'juan@example.test',
            'password' => Hash::make('a-secure-password'),
        ]);
        $oldSessionId = $this->app['session']->driver()->getId();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'juan@example.test',
            'password' => 'a-secure-password',
        ]);

        $response->assertOk()->assertJsonPath('data.id', (string) $user->getKey());
        $this->assertAuthenticatedAs($user);
        $this->assertNotSame($oldSessionId, $this->app['session']->driver()->getId());
        $this->assertDatabaseHas('audit_events', ['event_type' => 'auth.login_succeeded']);
    }

    public function test_login_failure_is_generic_and_audited_without_email_metadata(): void
    {
        User::factory()->create(['email' => 'juan@example.test']);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'juan@example.test',
            'password' => 'incorrect-password',
        ])->assertUnprocessable()->assertJsonPath('error.code', 'AUTHENTICATION_FAILED');

        $event = AuditEvent::query()->where('event_type', 'auth.login_failed')->firstOrFail();
        $this->assertNull($event->actor_user_id);
        $this->assertSame([], $event->metadata);
    }

    public function test_authenticated_user_can_read_self_and_logout(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.id', (string) $user->getKey());

        $this->postJson('/api/v1/auth/logout')
            ->assertOk()
            ->assertJsonPath('data.loggedOut', true);

        $this->assertGuest();
    }

    public function test_unauthenticated_user_cannot_read_self(): void
    {
        $this->getJson('/api/v1/me')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'AUTHENTICATION_REQUIRED');
    }

    public function test_login_is_rate_limited(): void
    {
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'missing@example.test',
                'password' => 'incorrect-password',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => 'missing@example.test',
            'password' => 'incorrect-password',
        ])->assertTooManyRequests();
    }
}
