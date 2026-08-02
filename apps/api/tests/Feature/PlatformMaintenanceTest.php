<?php

namespace Tests\Feature;

use App\Models\OutboxEvent;
use App\Models\User;
use App\Support\MaintenanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformMaintenanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_status_starts_idle(): void
    {
        $this->getJson('/api/v1/platform/maintenance')
            ->assertOk()
            ->assertJsonPath('data.phase', 'idle')
            ->assertJsonPath('data.enabled', false);
    }

    public function test_admin_can_schedule_maintenance_and_broadcast(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'admin',
        ]);

        $this->actingAs($admin)->postJson('/api/v1/admin/marketplace/maintenance/schedule', [
            'countdownSeconds' => 120,
            'message' => 'Brief pause coming up.',
        ])->assertOk()
            ->assertJsonPath('data.phase', 'scheduled')
            ->assertJsonPath('data.countdownSeconds', 120);

        $this->assertDatabaseHas('outbox_events', [
            'event_type' => 'platform.maintenance.scheduled',
            'resource_type' => 'platform_maintenance',
        ]);

        $event = OutboxEvent::query()->where('event_type', 'platform.maintenance.scheduled')->first();
        $this->assertNotNull($event);
        $this->assertSame('authenticated', $event->payload['broadcast'] ?? null);
    }

    public function test_staff_cannot_manage_maintenance(): void
    {
        $staff = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'staff',
        ]);

        $this->actingAs($staff)->postJson('/api/v1/admin/marketplace/maintenance/schedule', [
            'countdownSeconds' => 60,
        ])->assertForbidden();
    }

    public function test_active_maintenance_blocks_consumers_but_allows_staff(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'super_admin',
        ]);
        $consumer = User::factory()->create();

        $this->actingAs($admin)->postJson('/api/v1/admin/marketplace/maintenance/activate', [
            'message' => 'Offline for upgrades.',
        ])->assertOk()->assertJsonPath('data.phase', 'active');

        $this->actingAs($consumer)->getJson('/api/v1/me')
            ->assertStatus(503)
            ->assertJsonPath('error.code', 'MAINTENANCE_ACTIVE');

        $this->actingAs($admin)->getJson('/api/v1/admin/marketplace/maintenance')
            ->assertOk()
            ->assertJsonPath('data.phase', 'active');
    }

    public function test_active_status_replaces_pre_start_countdown_copy(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'admin',
        ]);

        $this->actingAs($admin)->postJson('/api/v1/admin/marketplace/maintenance/schedule', [
            'countdownSeconds' => 120,
            'message' => 'KAILA will pause briefly for maintenance. Please finish what you are doing.',
        ])->assertOk();

        $this->postJson('/api/v1/admin/marketplace/maintenance/activate')
            ->assertOk()
            ->assertJsonPath('data.phase', 'active')
            ->assertJsonPath(
                'data.message',
                'We are improving the marketplace. Please check back soon — your jobs and messages will be waiting.',
            );

        $this->getJson('/api/v1/platform/maintenance')
            ->assertOk()
            ->assertJsonPath(
                'data.message',
                'We are improving the marketplace. Please check back soon — your jobs and messages will be waiting.',
            );
    }

    public function test_scheduler_activates_due_window(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'admin',
        ]);

        $this->actingAs($admin)->postJson('/api/v1/admin/marketplace/maintenance/schedule', [
            'countdownSeconds' => 5,
        ])->assertOk();

        $row = app(MaintenanceService::class)->current();
        $row->forceFill(['scheduled_at' => now()->subSecond()])->save();

        $this->artisan('platform:activate-maintenance')->assertSuccessful();

        $this->assertSame('active', app(MaintenanceService::class)->current()->phase);
        $this->assertSame(
            'We are improving the marketplace. Please check back soon — your jobs and messages will be waiting.',
            app(MaintenanceService::class)->publicStatus()['message'],
        );
    }
}
