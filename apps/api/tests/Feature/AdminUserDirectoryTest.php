<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
