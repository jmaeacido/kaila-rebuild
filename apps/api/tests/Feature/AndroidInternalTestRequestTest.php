<?php

namespace Tests\Feature;

use App\Models\AndroidInternalTestRequest;
use App\Models\User;
use App\Notifications\BrandedAndroidInternalTestAccessRequest;
use App\Notifications\BrandedAndroidInternalTestInvite;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AndroidInternalTestRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_request_persists_and_notifies_support_and_admins(): void
    {
        Notification::fake();

        $admin = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'admin',
            'account_status' => 'active',
        ]);
        config(['kaila.support_email' => 'support@kaila-app.com']);

        $this->postJson('/api/v1/public/android-internal-test-requests', [
            'name' => '  Arlene Santos ',
            'email' => 'Arlene.Tester@Example.TEST',
            'note' => 'I want to try KAILA as a provider.',
        ])
            ->assertStatus(202)
            ->assertJsonPath('data.accepted', true);

        $this->assertDatabaseHas('android_internal_test_requests', [
            'name' => 'Arlene Santos',
            'email' => 'arlene.tester@example.test',
            'status' => AndroidInternalTestRequest::STATUS_PENDING,
        ]);

        Notification::assertSentOnDemand(BrandedAndroidInternalTestAccessRequest::class);

        $this->assertDatabaseHas('durable_notifications', [
            'user_id' => $admin->id,
            'type' => 'ops.android_test_access_request',
            'resource_type' => 'android_internal_test_request',
        ]);
    }

    public function test_public_request_rejects_invalid_payload(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/public/android-internal-test-requests', [
            'email' => 'not-an-email',
            'note' => str_repeat('x', 1001),
        ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_FAILED');

        Notification::assertNothingSent();
        $this->assertSame(0, AndroidInternalTestRequest::query()->count());
    }

    public function test_admin_can_list_and_invite_pending_request(): void
    {
        Notification::fake();

        $admin = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'admin',
            'account_status' => 'active',
        ]);
        $request = AndroidInternalTestRequest::query()->create([
            'name' => 'Devkev PH',
            'email' => 'devkev@example.test',
            'note' => null,
            'status' => AndroidInternalTestRequest::STATUS_PENDING,
        ]);

        $this->actingAs($admin)
            ->getJson('/api/v1/admin/marketplace/android-internal-test-requests')
            ->assertOk()
            ->assertJsonPath('data.summary.pending', 1)
            ->assertJsonPath('data.items.0.email', 'devkev@example.test');

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/marketplace/android-internal-test-requests/{$request->id}/invite")
            ->assertOk()
            ->assertJsonPath('data.status', AndroidInternalTestRequest::STATUS_INVITED);

        Notification::assertSentOnDemand(BrandedAndroidInternalTestInvite::class);
        $this->assertSame(AndroidInternalTestRequest::STATUS_INVITED, $request->fresh()->status);
        $this->assertSame((int) $admin->id, (int) $request->fresh()->invited_by);
    }

    public function test_admin_can_dismiss_and_reopen_request(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'admin',
            'account_status' => 'active',
        ]);
        $request = AndroidInternalTestRequest::query()->create([
            'name' => 'Tester',
            'email' => 'tester@example.test',
            'status' => AndroidInternalTestRequest::STATUS_PENDING,
        ]);

        $this->actingAs($admin)
            ->putJson("/api/v1/admin/marketplace/android-internal-test-requests/{$request->id}", [
                'status' => AndroidInternalTestRequest::STATUS_DISMISSED,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', AndroidInternalTestRequest::STATUS_DISMISSED);

        $this->actingAs($admin)
            ->putJson("/api/v1/admin/marketplace/android-internal-test-requests/{$request->id}", [
                'status' => AndroidInternalTestRequest::STATUS_PENDING,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', AndroidInternalTestRequest::STATUS_PENDING);
    }
}
