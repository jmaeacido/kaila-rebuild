<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AccountDeletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_preview_and_permanently_anonymize_an_eligible_account(): void
    {
        $user = User::factory()->create(['password' => 'correct-password']);
        DB::table('push_devices')->insert(['id' => fake()->uuid(), 'user_id' => $user->id, 'platform' => 'web', 'token_hash' => hash('sha256', 'secret-push-token'), 'token_encrypted' => 'encrypted', 'last_seen_at' => now(), 'created_at' => now(), 'updated_at' => now()]);

        $this->actingAs($user)->getJson('/api/v1/me/account-deletion')
            ->assertOk()->assertJsonPath('data.eligible', true);

        $this->deleteJson('/api/v1/me/account', ['currentPassword' => 'correct-password', 'confirmation' => 'DELETE'])
            ->assertOk()->assertJsonStructure(['data' => ['recordId', 'deletedAt']]);

        $user->refresh();
        $this->assertSame('Deleted KAILA member', $user->name);
        $this->assertSame('deleted', $user->account_status);
        $this->assertNotNull($user->deleted_at);
        $this->assertStringEndsWith('@deleted.kaila.invalid', $user->email);
        $this->assertDatabaseMissing('push_devices', ['user_id' => $user->id]);
        $this->assertDatabaseHas('account_deletion_records', ['user_id' => $user->id, 'outcome' => 'completed']);
        $this->assertGuest();
    }

    public function test_active_work_blocks_deletion_and_records_the_attempt(): void
    {
        $user = User::factory()->create(['password' => 'correct-password']);
        $categoryId = DB::table('service_categories')->insertGetId(['name' => 'Cleaning', 'slug' => 'cleaning', 'icon' => 'sparkles', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $areaId = DB::table('areas')->insertGetId(['name' => 'Butuan', 'code' => 'BUT', 'type' => 'city', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('service_jobs')->insert(['id' => fake()->uuid(), 'client_user_id' => $user->id, 'service_category_id' => $categoryId, 'area_id' => $areaId, 'title' => 'Active job', 'description' => 'Still active', 'status' => 'posted', 'schedule_type' => 'asap', 'created_at' => now(), 'updated_at' => now()]);

        $this->actingAs($user)->getJson('/api/v1/me/account-deletion')
            ->assertOk()->assertJsonPath('data.eligible', false)->assertJsonPath('data.blockers.0.code', 'ACTIVE_JOBS');

        $this->deleteJson('/api/v1/me/account', ['currentPassword' => 'correct-password', 'confirmation' => 'DELETE'])
            ->assertConflict()->assertJsonPath('error.code', 'DELETION_BLOCKED');
        $this->assertDatabaseHas('account_deletion_records', ['user_id' => $user->id, 'outcome' => 'blocked']);
        $this->assertNull($user->fresh()->deleted_at);
    }

    public function test_rated_closed_jobs_do_not_block_account_deletion(): void
    {
        $user = User::factory()->create(['password' => 'correct-password']);
        $categoryId = DB::table('service_categories')->insertGetId(['name' => 'Plumbing', 'slug' => 'plumbing', 'icon' => 'wrench', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $areaId = DB::table('areas')->insertGetId(['name' => 'Ampayon', 'code' => 'AMP', 'type' => 'barangay', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('service_jobs')->insert([
            'id' => fake()->uuid(),
            'client_user_id' => $user->id,
            'service_category_id' => $categoryId,
            'area_id' => $areaId,
            'title' => 'Finished job',
            'description' => 'Already rated and closed',
            'status' => 'rated_closed',
            'schedule_type' => 'asap',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($user)->getJson('/api/v1/me/account-deletion')
            ->assertOk()
            ->assertJsonPath('data.eligible', true)
            ->assertJsonPath('data.blockers', []);
    }

    public function test_password_and_admin_access_are_enforced(): void
    {
        $user = User::factory()->create(['password' => 'correct-password']);
        $this->actingAs($user)->getJson('/api/v1/me/account-deletion')
            ->assertOk()
            ->assertJsonPath('data.requiresPassword', true);
        $this->actingAs($user)->postJson('/api/v1/me/account-deletion/verify-password', ['currentPassword' => 'wrong-password'])
            ->assertOk()->assertJsonPath('data.valid', false);
        $this->actingAs($user)->postJson('/api/v1/me/account-deletion/verify-password', ['currentPassword' => 'correct-password'])
            ->assertOk()->assertJsonPath('data.valid', true);
        $this->actingAs($user)->deleteJson('/api/v1/me/account', ['currentPassword' => 'wrong-password', 'confirmation' => 'DELETE'])
            ->assertUnprocessable()->assertJsonPath('error.code', 'PASSWORD_INCORRECT');
        $this->getJson('/api/v1/admin/marketplace/account-deletions')->assertForbidden();

        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin)->getJson('/api/v1/admin/marketplace/account-deletions')->assertOk();
    }

    public function test_google_accounts_confirm_deletion_with_email_instead_of_password(): void
    {
        $user = User::factory()->create([
            'email' => 'member@gmail.com',
            'password' => 'unused-random-password',
            'auth_provider' => 'google',
            'auth_subject' => 'google:subject-123',
        ]);

        $this->actingAs($user)->getJson('/api/v1/me/account-deletion')
            ->assertOk()
            ->assertJsonPath('data.requiresPassword', false)
            ->assertJsonPath('data.authProvider', 'google')
            ->assertJsonPath('data.email', 'member@gmail.com');

        $this->actingAs($user)->postJson('/api/v1/me/account-deletion/verify-password', ['currentPassword' => 'unused-random-password'])
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'PASSWORD_NOT_USED');

        $this->actingAs($user)->deleteJson('/api/v1/me/account', [
            'emailConfirmation' => 'wrong@gmail.com',
            'confirmation' => 'DELETE',
        ])->assertUnprocessable()->assertJsonPath('error.code', 'EMAIL_MISMATCH');

        $this->actingAs($user)->deleteJson('/api/v1/me/account', [
            'emailConfirmation' => 'Member@Gmail.com',
            'confirmation' => 'DELETE',
        ])->assertOk()->assertJsonStructure(['data' => ['recordId', 'deletedAt']]);

        $this->assertNotNull($user->fresh()->deleted_at);
        $this->assertGuest();
    }
}
