<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\ClientProfile;
use App\Models\IdentityVerification;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\ServiceJob;
use App\Models\SupportCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminUserDirectoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_manage_admin_staff_and_users(): void
    {
        $super = User::factory()->create([
            'email' => 'jacido94@yahoo.com',
            'is_admin' => true,
            'staff_role' => 'super_admin',
            'account_status' => 'active',
        ]);

        $this->actingAs($super)->getJson('/api/v1/admin/marketplace/users')
            ->assertOk()
            ->assertJsonPath('data.capabilities.canCreateAdmin', true)
            ->assertJsonPath('data.capabilities.canDeleteAccounts', true);

        $admin = $this->postJson('/api/v1/admin/marketplace/users', [
            'name' => 'Ops Admin',
            'email' => 'ops.admin@example.test',
            'password' => 'password123',
            'accountType' => 'admin',
        ])->assertCreated()->json('data');

        $this->assertSame('admin', $admin['staffRole']);
        $this->assertDatabaseHas('users', ['email' => 'ops.admin@example.test', 'staff_role' => 'admin', 'is_admin' => true]);

        $staff = $this->postJson('/api/v1/admin/marketplace/users', [
            'name' => 'Support Staff',
            'email' => 'support.staff@example.test',
            'password' => 'password123',
            'accountType' => 'staff',
        ])->assertCreated()->json('data');

        $user = $this->postJson('/api/v1/admin/marketplace/users', [
            'name' => 'Marketplace User',
            'email' => 'member@example.test',
            'password' => 'password123',
            'accountType' => 'user',
        ])->assertCreated()->json('data');

        $this->postJson("/api/v1/admin/marketplace/users/{$staff['id']}/deactivate")->assertOk()
            ->assertJsonPath('data.accountStatus', 'deactivated');
        $this->postJson("/api/v1/admin/marketplace/users/{$staff['id']}/activate")->assertOk()
            ->assertJsonPath('data.accountStatus', 'active');
        $this->deleteJson("/api/v1/admin/marketplace/users/{$user['id']}")->assertOk()
            ->assertJsonPath('data.accountStatus', 'deleted');
        $this->deleteJson("/api/v1/admin/marketplace/users/{$admin['id']}")->assertOk()
            ->assertJsonPath('data.accountStatus', 'deleted');
    }

    public function test_admin_cannot_create_or_delete_admins_but_can_manage_staff_and_users(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'admin',
            'account_status' => 'active',
        ]);
        $otherAdmin = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'admin',
            'account_status' => 'active',
        ]);

        $this->actingAs($admin)->postJson('/api/v1/admin/marketplace/users', [
            'name' => 'Blocked Admin',
            'email' => 'blocked.admin@example.test',
            'password' => 'password123',
            'accountType' => 'admin',
        ])->assertForbidden();

        $staff = $this->postJson('/api/v1/admin/marketplace/users', [
            'name' => 'Desk Staff',
            'email' => 'desk.staff@example.test',
            'password' => 'password123',
            'accountType' => 'staff',
        ])->assertCreated()->json('data');

        $this->postJson("/api/v1/admin/marketplace/users/{$staff['id']}/deactivate")->assertOk();
        $this->postJson("/api/v1/admin/marketplace/users/{$otherAdmin['id']}/deactivate")->assertForbidden();
        $this->deleteJson("/api/v1/admin/marketplace/users/{$staff['id']}")->assertForbidden();
    }

    public function test_super_admin_and_admin_can_edit_accounts_within_authority(): void
    {
        $super = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'super_admin',
            'account_status' => 'active',
        ]);
        $admin = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'admin',
            'account_status' => 'active',
            'name' => 'Ops Admin',
            'email' => 'ops.edit@example.test',
        ]);
        $staff = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'staff',
            'account_status' => 'active',
            'name' => 'Desk Staff',
            'email' => 'desk.edit@example.test',
        ]);

        $this->actingAs($super)->putJson("/api/v1/admin/marketplace/users/{$admin->id}", [
            'name' => 'Ops Admin Updated',
            'email' => 'ops.edit.updated@example.test',
            'accountType' => 'admin',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Ops Admin Updated')
            ->assertJsonPath('data.email', 'ops.edit.updated@example.test')
            ->assertJsonPath('data.actions.canEdit', true);

        $this->actingAs($admin)->putJson("/api/v1/admin/marketplace/users/{$staff->id}", [
            'name' => 'Desk Staff Updated',
            'email' => 'desk.edit.updated@example.test',
            'accountType' => 'user',
        ])->assertOk()
            ->assertJsonPath('data.staffRole', 'user');

        $otherAdmin = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'admin',
            'account_status' => 'active',
        ]);
        $this->actingAs($admin)->putJson("/api/v1/admin/marketplace/users/{$otherAdmin->id}", [
            'name' => 'Nope',
            'email' => 'nope.admin@example.test',
            'accountType' => 'staff',
        ])->assertForbidden();
    }

    public function test_status_endpoint_moves_accounts_across_board_columns(): void
    {
        $super = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'super_admin',
            'account_status' => 'active',
        ]);
        $member = User::factory()->create([
            'account_status' => 'active',
            'staff_role' => null,
        ]);

        $this->actingAs($super)->postJson("/api/v1/admin/marketplace/users/{$member->id}/status", [
            'accountStatus' => 'restricted',
        ])->assertOk()->assertJsonPath('data.accountStatus', 'restricted');

        $this->postJson("/api/v1/admin/marketplace/users/{$member->id}/status", [
            'accountStatus' => 'deactivated',
        ])->assertOk()->assertJsonPath('data.accountStatus', 'deactivated');

        $this->postJson("/api/v1/admin/marketplace/users/{$member->id}/status", [
            'accountStatus' => 'active',
        ])->assertOk()->assertJsonPath('data.accountStatus', 'active');

        $this->postJson("/api/v1/admin/marketplace/users/{$member->id}/status", [
            'accountStatus' => 'deleted',
        ])->assertOk()->assertJsonPath('data.accountStatus', 'deleted');
    }

    public function test_staff_can_view_directory_but_cannot_mutate_accounts(): void
    {
        $staff = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'staff',
            'account_status' => 'active',
        ]);
        $member = User::factory()->create(['account_status' => 'active']);

        $this->actingAs($staff)->getJson('/api/v1/admin/marketplace/users')
            ->assertOk()
            ->assertJsonPath('data.capabilities.canCreateUser', false);

        $this->postJson('/api/v1/admin/marketplace/users', [
            'name' => 'Nope',
            'email' => 'nope@example.test',
            'password' => 'password123',
            'accountType' => 'user',
        ])->assertForbidden();

        $this->postJson("/api/v1/admin/marketplace/users/{$member->id}/deactivate")->assertForbidden();
    }

    public function test_directory_includes_registration_and_latest_session_activity_dates(): void
    {
        $super = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'super_admin',
            'account_status' => 'active',
        ]);
        $member = User::factory()->create([
            'created_at' => '2026-08-01 10:30:00',
        ]);
        DB::table('sessions')->insert([
            [
                'id' => 'older-session',
                'user_id' => $member->id,
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Test browser',
                'payload' => '',
                'last_activity' => 1_754_048_800,
            ],
            [
                'id' => 'latest-session',
                'user_id' => $member->id,
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Test browser',
                'payload' => '',
                'last_activity' => 1_754_052_400,
            ],
        ]);

        $items = $this->actingAs($super)
            ->getJson('/api/v1/admin/marketplace/users')
            ->assertOk()
            ->json('data.items');
        $presented = collect($items)->firstWhere('id', (string) $member->id);

        $this->assertSame('2026-08-01T10:30:00+00:00', $presented['createdAt']);
        $this->assertSame('2025-08-01T12:46:40+00:00', $presented['lastActiveAt']);
    }

    public function test_staff_can_view_user_ops_dossier_with_profiles_jobs_and_activity(): void
    {
        $staff = User::factory()->create([
            'is_admin' => true,
            'staff_role' => 'staff',
            'account_status' => 'active',
        ]);
        $member = User::factory()->create([
            'name' => 'Dossier Member',
            'email' => 'dossier.member@example.test',
            'account_status' => 'active',
            'staff_role' => null,
        ]);
        $area = Area::query()->create([
            'type' => 'city',
            'name' => 'Butuan City',
            'code' => 'BXU',
            'is_active' => true,
        ]);
        $category = ServiceCategory::query()->create([
            'name' => 'Plumbing',
            'slug' => 'plumbing-dossier',
            'icon' => 'Wrench',
            'is_active' => true,
        ]);
        ClientProfile::query()->create([
            'user_id' => $member->id,
            'display_name' => 'Dossier Client',
            'area_id' => $area->id,
        ]);
        $provider = ProviderProfile::query()->create([
            'user_id' => $member->id,
            'display_name' => 'Dossier Provider',
            'bio' => 'Local repairs with careful, friendly service.',
            'status' => 'active',
            'years_experience' => 3,
            'completed_jobs' => 2,
            'rating' => 4.50,
            'reviewed_at' => now()->subDay(),
            'review_note' => 'Looks good',
            'reviewed_by' => $staff->id,
        ]);
        $provider->services()->attach($category);
        $provider->serviceAreas()->attach($area);
        IdentityVerification::query()->create([
            'user_id' => $member->id,
            'status' => 'approved',
            'submitted_at' => now()->subDays(3),
            'reviewed_at' => now()->subDays(2),
            'decision_reason' => null,
        ]);
        $job = ServiceJob::query()->create([
            'client_user_id' => $member->id,
            'service_category_id' => $category->id,
            'area_id' => $area->id,
            'title' => 'Fix kitchen sink',
            'description' => 'Leaking faucet under the sink',
            'status' => 'posted',
            'schedule_type' => 'asap',
            'posted_at' => now()->subHours(2),
        ]);
        SupportCase::query()->create([
            'reference' => 'SUP-DOSSIER-1',
            'customer_user_id' => $member->id,
            'category' => 'account',
            'subject' => 'Need help signing in',
            'status' => 'open',
            'priority' => 'normal',
            'last_message_at' => now()->subHour(),
        ]);
        DB::table('sessions')->insert([
            'id' => 'dossier-session',
            'user_id' => $member->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Test browser',
            'payload' => '',
            'last_activity' => now()->subMinutes(15)->timestamp,
        ]);

        $payload = $this->actingAs($staff)
            ->getJson("/api/v1/admin/marketplace/users/{$member->id}")
            ->assertOk()
            ->assertJsonPath('data.account.id', (string) $member->id)
            ->assertJsonPath('data.account.name', 'Dossier Member')
            ->assertJsonPath('data.account.actions.canEdit', false)
            ->assertJsonPath('data.client.displayName', 'Dossier Client')
            ->assertJsonPath('data.client.area.name', 'Butuan City')
            ->assertJsonPath('data.provider.displayName', 'Dossier Provider')
            ->assertJsonPath('data.provider.status', 'active')
            ->assertJsonPath('data.identity.status', 'approved')
            ->assertJsonPath('data.capabilities.canCreateUser', false)
            ->json('data');

        $this->assertTrue(collect($payload['recentJobs'])->contains(
            fn (array $row) => $row['id'] === $job->id && $row['role'] === 'client'
        ));
        $this->assertTrue(collect($payload['activity'])->contains(
            fn (array $row) => $row['kind'] === 'support' && str_contains($row['title'], 'SUP-DOSSIER-1')
        ));
        $this->assertTrue(collect($payload['activity'])->contains(
            fn (array $row) => $row['kind'] === 'provider_review'
        ));
    }

    public function test_non_staff_cannot_view_user_ops_dossier(): void
    {
        $member = User::factory()->create(['account_status' => 'active']);
        $target = User::factory()->create(['account_status' => 'active']);

        $this->actingAs($member)
            ->getJson("/api/v1/admin/marketplace/users/{$target->id}")
            ->assertForbidden();
    }
}
