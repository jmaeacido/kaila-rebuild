<?php

namespace Tests\Feature;

use App\Jobs\ScanIdentityEvidence;
use App\Models\IdentityVerification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class IdentityVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_capture_is_fail_closed_by_default(): void
    {
        config()->set('identity_verification.capture_enabled', false);
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
        $this->actingAs($user)->getJson('/api/v1/me')
            ->assertOk()->assertJsonPath('data.identityVerified', true);
    }

    public function test_withdrawal_removes_verified_status(): void
    {
        $user = User::factory()->create();
        $verification = IdentityVerification::query()->create(['user_id' => $user->id, 'status' => 'approved', 'reviewed_at' => now(), 'verified_until' => now()->addYear()]);
        $this->actingAs($user)->deleteJson('/api/v1/me/identity-verification/consent')
            ->assertOk()->assertJsonPath('data.identityVerified', false)->assertJsonPath('data.status', 'withdrawn');
        $this->assertNotNull($verification->fresh()->consent_withdrawn_at);
    }

    public function test_submission_notifies_admins_and_appears_in_pending_summary(): void
    {
        config()->set('identity_verification.capture_enabled', true);
        Storage::fake((string) config('identity_verification.disk'));
        Queue::fake();

        $admin = User::factory()->create(['is_admin' => true, 'name' => 'Ops Admin']);
        $user = User::factory()->create(['name' => 'Jamie Consumer']);

        $session = $this->actingAs($user)->postJson('/api/v1/me/identity-verification/consent', [
            'noticeVersion' => 'identity-verification-1.0',
            'privacyPolicyVersion' => '1.0',
            'purpose' => 'identity_verification',
            'trigger' => 'account_settings',
            'consented' => true,
        ])->assertCreated()->json('data');

        $this->actingAs($user)->post('/api/v1/me/identity-verification/submit', [
            'sessionId' => $session['sessionId'],
            'uploadToken' => $session['uploadToken'],
            'idType' => 'philid',
            'issuingCountry' => 'PH',
            'idFront' => UploadedFile::fake()->image('id-front.jpg', 640, 480),
            'selfie' => UploadedFile::fake()->image('selfie.jpg', 640, 480),
            'selfieCapturedNow' => '1',
        ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.status', 'submitted');

        Queue::assertPushedOn('maintenance', ScanIdentityEvidence::class);
        $this->assertDatabaseHas('durable_notifications', [
            'user_id' => $admin->id,
            'type' => 'admin.identity.submitted',
            'resource_type' => 'identity_verification',
            'resource_id' => $session['verificationId'],
            'title' => 'Identity check needs review',
        ]);

        $this->actingAs($admin)->getJson('/api/v1/admin/marketplace/identity-verifications/summary')
            ->assertOk()
            ->assertJsonPath('data.pendingCount', 1);
        $this->actingAs($admin)->getJson('/api/v1/admin/marketplace/identity-verifications')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $session['verificationId']);
    }
}
