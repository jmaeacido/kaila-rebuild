<?php

namespace Tests\Feature;

use App\Models\IdentityVerification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IdentityVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_capture_is_fail_closed_by_default(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->getJson('/api/v1/me/identity-verification')
            ->assertOk()->assertJsonPath('data.captureAvailable', false)->assertJsonPath('data.status', 'not_started');
        $this->postJson('/api/v1/me/identity-verification/consent', [
            'noticeVersion' => 'identity-verification-1.0', 'privacyPolicyVersion' => '1.0',
            'purpose' => 'identity_verification', 'trigger' => 'account_settings', 'consented' => true,
        ])->assertServiceUnavailable();
    }

    public function test_only_account_level_approval_produces_verified_status(): void
    {
        $user = User::factory()->create();
        IdentityVerification::query()->create(['user_id' => $user->id, 'status' => 'approved', 'reviewed_at' => now(), 'verified_until' => now()->addYear()]);
        $this->actingAs($user)->getJson('/api/v1/me/identity-verification')
            ->assertOk()->assertJsonPath('data.identityVerified', true)->assertJsonPath('data.status', 'approved');
    }

    public function test_withdrawal_removes_verified_status(): void
    {
        $user = User::factory()->create();
        $verification = IdentityVerification::query()->create(['user_id' => $user->id, 'status' => 'approved', 'reviewed_at' => now(), 'verified_until' => now()->addYear()]);
        $this->actingAs($user)->deleteJson('/api/v1/me/identity-verification/consent')
            ->assertOk()->assertJsonPath('data.identityVerified', false)->assertJsonPath('data.status', 'withdrawn');
        $this->assertNotNull($verification->fresh()->consent_withdrawn_at);
    }
}
