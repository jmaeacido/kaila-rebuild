<?php

namespace Tests\Feature;

use App\Models\PushDevice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminPushDeviceTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_admins_can_register_admin_android_push_devices(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/api/v1/push-devices', [
            'platform' => 'admin_android',
            'token' => 'regular-user-admin-token',
        ])->assertForbidden();

        $admin = User::factory()->create(['is_admin' => true]);
        $id = $this->actingAs($admin)->postJson('/api/v1/push-devices', [
            'platform' => 'admin_android',
            'token' => 'admin-device-token',
        ])->assertCreated()->assertJsonPath('data.platform', 'admin_android')->json('data.id');

        $this->assertDatabaseHas('push_devices', [
            'id' => $id,
            'user_id' => $admin->id,
            'platform' => 'admin_android',
            'token_hash' => hash('sha256', 'admin-device-token'),
        ]);
    }

    public function test_admin_can_revoke_only_their_own_push_device(): void
    {
        $owner = User::factory()->create(['is_admin' => true]);
        $other = User::factory()->create(['is_admin' => true]);
        $device = PushDevice::query()->create([
            'user_id' => $owner->id,
            'platform' => 'admin_android',
            'token_hash' => hash('sha256', 'owned-token'),
            'token_encrypted' => 'owned-token',
            'last_seen_at' => now(),
        ]);

        $this->actingAs($other)->deleteJson("/api/v1/push-devices/{$device->id}")->assertNotFound();
        $this->actingAs($owner)->deleteJson("/api/v1/push-devices/{$device->id}")->assertOk();
        $this->assertNotNull($device->refresh()->revoked_at);
    }
}
