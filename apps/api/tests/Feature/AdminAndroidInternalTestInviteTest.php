<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\BrandedAndroidInternalTestInvite;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AdminAndroidInternalTestInviteTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_send_invites_to_selected_users_and_pasted_emails(): void
    {
        Notification::fake();

        $admin = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'admin',
            'account_status' => 'active',
        ]);
        $member = User::factory()->create([
            'name' => 'Arlene Santos',
            'email' => 'arlene@example.test',
            'staff_role' => null,
            'account_status' => 'active',
        ]);
        $deleted = User::factory()->create([
            'email' => 'gone@example.test',
            'staff_role' => null,
            'account_status' => 'deleted',
        ]);

        $this->actingAs($admin)->postJson('/api/v1/admin/marketplace/mail/android-internal-test', [
            'userIds' => [(string) $member->id, (string) $deleted->id, 'missing-id'],
            'emails' => [
                'arlene@example.test',
                'new.tester@example.test',
                'not-an-email',
                '',
            ],
        ])
            ->assertOk()
            ->assertJsonPath('data.sent', 2)
            ->assertJsonPath('data.inboxSent', 1)
            ->assertJsonPath('data.skipped', 3);

        Notification::assertSentTo(
            $member,
            BrandedAndroidInternalTestInvite::class,
            function (BrandedAndroidInternalTestInvite $notification) use ($member): bool {
                $mail = $notification->toMail($member);

                return str_contains($mail->render(), 'Hi Arlene')
                    && $mail->subject === "You're invited to test KAILA on Android";
            },
        );

        Notification::assertSentOnDemand(
            BrandedAndroidInternalTestInvite::class,
            function (BrandedAndroidInternalTestInvite $notification, array $channels, object $notifiable): bool {
                return ($notifiable->routes['mail'] ?? null) === 'new.tester@example.test'
                    && in_array('mail', $channels, true);
            },
        );

        $this->assertDatabaseHas('durable_notifications', [
            'user_id' => $member->id,
            'type' => 'ops.android_test_invite',
            'resource_type' => 'ops_invite',
            'resource_id' => 'android-internal-test',
            'title' => "You're invited to test KAILA on Android",
        ]);
        $this->assertDatabaseMissing('durable_notifications', [
            'type' => 'ops.android_test_invite',
            'title' => "You're invited to test KAILA on Android",
            'user_id' => $deleted->id,
        ]);
    }

    public function test_staff_cannot_send_android_test_invites(): void
    {
        Notification::fake();

        $staff = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'staff',
            'account_status' => 'active',
        ]);

        $this->actingAs($staff)->postJson('/api/v1/admin/marketplace/mail/android-internal-test', [
            'emails' => ['someone@example.test'],
        ])->assertForbidden();

        Notification::assertNothingSent();
    }

    public function test_requires_at_least_one_recipient(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'admin',
            'account_status' => 'active',
        ]);

        $this->actingAs($admin)->postJson('/api/v1/admin/marketplace/mail/android-internal-test', [
            'userIds' => [],
            'emails' => [],
        ])->assertUnprocessable();
    }

    public function test_directory_capabilities_include_ops_mail_flag(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'admin',
            'account_status' => 'active',
        ]);
        $staff = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'staff',
            'account_status' => 'active',
        ]);

        $this->actingAs($admin)->getJson('/api/v1/admin/marketplace/users')
            ->assertOk()
            ->assertJsonPath('data.capabilities.canSendOpsMail', true);

        $this->actingAs($staff)->getJson('/api/v1/admin/marketplace/users')
            ->assertOk()
            ->assertJsonPath('data.capabilities.canSendOpsMail', false);
    }
}
