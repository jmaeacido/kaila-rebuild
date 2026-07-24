<?php

namespace Tests\Feature\Auth;

use App\Models\AuditEvent;
use App\Models\ProfileAsset;
use App\Models\User;
use App\Notifications\BrandedWelcome;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_with_current_policy_versions(): void
    {
        Notification::fake();

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
        Notification::assertSentTo(
            User::query()->where('email', 'juan@example.test')->firstOrFail(),
            BrandedWelcome::class,
        );
    }

    public function test_registration_config_exposes_current_policy_versions(): void
    {
        $this->getJson('/api/v1/auth/registration-config')
            ->assertOk()
            ->assertJsonPath('data.termsVersion', config('policies.terms_version'))
            ->assertJsonPath('data.privacyVersion', config('policies.privacy_version'));
    }

    public function test_session_status_is_public_and_reports_authentication_state(): void
    {
        $this->getJson('/api/v1/auth/session-status')
            ->assertOk()
            ->assertJsonPath('data.authenticated', false);

        $this->actingAs(User::factory()->create())
            ->getJson('/api/v1/auth/session-status')
            ->assertOk()
            ->assertJsonPath('data.authenticated', true);
    }

    public function test_marketplace_actions_require_authentication(): void
    {
        $this->getJson('/api/v1/providers')->assertUnauthorized();
        $this->getJson('/api/v1/community')->assertUnauthorized();
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

    public function test_self_uses_only_a_clean_avatar(): void
    {
        $user = User::factory()->create();
        ProfileAsset::query()->create([
            'user_id' => $user->getKey(), 'purpose' => 'avatar', 'disk' => 'private-assets',
            'object_key' => 'avatars/pending.jpg', 'original_name' => 'pending.jpg',
            'mime_type' => 'image/jpeg', 'size_bytes' => 100, 'scan_status' => 'pending',
        ]);
        $clean = ProfileAsset::query()->create([
            'user_id' => $user->getKey(), 'purpose' => 'avatar', 'disk' => 'private-assets',
            'object_key' => 'avatars/clean.jpg', 'original_name' => 'clean.jpg',
            'mime_type' => 'image/jpeg', 'size_bytes' => 100, 'scan_status' => 'clean', 'origin' => 'upload',
        ]);
        ProfileAsset::query()->create([
            'user_id' => $user->getKey(), 'purpose' => 'avatar', 'disk' => 'private-assets',
            'object_key' => 'avatars/social.jpg', 'original_name' => 'google-profile-picture.jpg',
            'mime_type' => 'image/jpeg', 'size_bytes' => 100, 'scan_status' => 'clean', 'origin' => 'social',
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.avatarUrl', "/api/v1/profile-assets/{$clean->getKey()}");
    }

    public function test_unauthenticated_user_cannot_read_self(): void
    {
        $this->getJson('/api/v1/me')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'AUTHENTICATION_REQUIRED');
    }

    public function test_unauthenticated_api_request_without_json_accept_header_does_not_redirect(): void
    {
        $this->get('/api/v1/admin/marketplace/review-queue')
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
