<?php

namespace Tests\Feature;

use App\Models\NotificationPreference;
use App\Models\PushDevice;
use App\Models\User;
use App\Support\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
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

    public function test_muted_messages_remain_durable_and_realtime_without_push(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        NotificationPreference::query()->create(['user_id' => $user->id, 'mute_messages' => true, 'timezone' => 'Asia/Manila']);
        PushDevice::query()->create([
            'user_id' => $user->id,
            'platform' => 'android',
            'token_hash' => hash('sha256', 'test-token'),
            'token_encrypted' => 'test-token',
            'last_seen_at' => now(),
        ]);

        DB::transaction(fn () => app(NotificationService::class)->send(
            $user->id,
            'message.created',
            'New message',
            'Open the conversation.',
            'service_job',
            'job-1',
            ['jobId' => 'job-1'],
            'message',
        ));

        $this->assertDatabaseHas('durable_notifications', ['user_id' => $user->id, 'type' => 'message.created']);
        $this->assertDatabaseCount('push_delivery_attempts', 0);
        $this->assertDatabaseHas('outbox_events', ['event_type' => 'notification.created']);
    }

    public function test_notification_inbox_reports_unread_and_supports_read_all(): void
    {
        $user = User::factory()->create();
        DB::transaction(fn () => app(NotificationService::class)->send(
            $user->id,
            'offer.created',
            'New offer',
            'A provider sent an offer.',
            'service_job',
            'job-1',
            ['jobId' => 'job-1'],
        ));

        $this->actingAs($user)->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonPath('meta.unreadCount', 1)
            ->assertJsonPath('data.0.resourceType', 'service_job')
            ->assertJsonPath('data.0.data.type', 'offer');

        $this->putJson('/api/v1/notifications/read')->assertOk();
        $this->getJson('/api/v1/notifications')->assertJsonPath('meta.unreadCount', 0);
        $this->assertDatabaseHas('outbox_events', ['event_type' => 'notification.read_all']);
    }
}
