<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationPreferencesTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_manage_only_mutable_notification_preferences(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/v1/me/notification-preferences')
            ->assertOk()
            ->assertJsonPath('data.securityNotificationsEnabled', true)
            ->assertJsonPath('data.materialJobNotificationsEnabled', true);

        $this->putJson('/api/v1/me/notification-preferences', [
            'muteMessages' => true,
            'muteRoutineReminders' => true,
            'quietHoursStart' => '22:00',
            'quietHoursEnd' => '07:00',
            'timezone' => 'Asia/Manila',
        ])->assertOk()->assertJsonPath('data.muteMessages', true);

        $this->assertDatabaseHas('notification_preferences', [
            'user_id' => $user->getKey(),
            'mute_messages' => true,
        ]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'notification.preferences_updated']);
    }

    public function test_security_and_material_job_notifications_cannot_be_disabled(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->putJson('/api/v1/me/notification-preferences', [
            'muteMessages' => false,
            'muteRoutineReminders' => false,
            'timezone' => 'Asia/Manila',
            'securityNotifications' => false,
        ])->assertUnprocessable()->assertJsonPath('error.code', 'VALIDATION_FAILED');
    }

    public function test_android_preferences_are_bound_to_bearer_identity(): void
    {
        $user = User::factory()->create();
        $tokens = $this->postJson('/api/v1/auth/mobile/login', [
            'email' => $user->email,
            'password' => 'password',
            'deviceName' => 'Preference test phone',
        ])->assertOk()->json('data.tokens');

        $this->withToken($tokens['accessToken'])
            ->getJson('/api/v1/auth/mobile/notification-preferences')
            ->assertOk()
            ->assertJsonPath('data.timezone', 'Asia/Manila');
    }
}
