<?php

namespace Tests\Feature;

use App\Jobs\ScanIdentityEvidence;
use App\Models\IdentityEvidence;
use App\Models\IdentityVerification;
use App\Models\IdentityVerificationConsent;
use App\Models\IdentityVerificationSession;
use App\Models\User;
use App\Support\IdentityVerificationService;
use App\Support\TotpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class IdentityVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('identity_verification.rollout_percent', 100);
        config()->set('identity_verification.notice_version', 'identity-verification-1.1');
        config()->set('identity_verification.consent_version', 'identity-consent-1.1');
        config()->set('identity_verification.privacy_policy_version', '2026-09-11');
    }

    public function test_capture_is_fail_closed_by_default(): void
    {
        config()->set('identity_verification.capture_enabled', false);
        $user = User::factory()->create();
        $this->actingAs($user)->getJson('/api/v1/me/identity-verification')
            ->assertOk()->assertJsonPath('data.captureAvailable', false)->assertJsonPath('data.status', 'not_started');
        $this->postJson('/api/v1/me/identity-verification/consent', $this->consentPayload())
            ->assertServiceUnavailable();
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

        $session = $this->actingAs($user)->postJson('/api/v1/me/identity-verification/consent', $this->consentPayload())
            ->assertCreated()->json('data');

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

        // Pending summary requires MFA; configure and challenge first.
        $totp = app(TotpService::class);
        $secret = $totp->generateSecret();
        $admin->forceFill(['mfa_secret' => encrypt($secret), 'mfa_confirmed_at' => now(), 'mfa_recovery_codes' => []])->save();
        $this->actingAs($admin)->postJson('/api/v1/admin/marketplace/mfa/challenge', [
            'code' => $totp->codeAt($secret, (int) floor(time() / 30)),
        ])->assertOk();

        $this->actingAs($admin)->getJson('/api/v1/admin/marketplace/identity-verifications/summary')
            ->assertOk()
            ->assertJsonPath('data.pendingCount', 1);
        $this->actingAs($admin)->getJson('/api/v1/admin/marketplace/identity-verifications')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $session['verificationId']);
    }

    public function test_enforcement_blocks_unverified_users_when_enabled(): void
    {
        config()->set('identity_verification.enforcement_enabled', true);
        $user = User::factory()->create();

        try {
            app(IdentityVerificationService::class)->enforce($user, 'post_job');
            $this->fail('Expected enforcement abort.');
        } catch (HttpException $exception) {
            $this->assertSame(409, $exception->getStatusCode());
            $this->assertSame('Verify your identity before posting your first job.', $exception->getMessage());
        }
    }

    public function test_user_status_exposes_no_evidence_urls(): void
    {
        $user = User::factory()->create();
        IdentityVerification::query()->create(['user_id' => $user->id, 'status' => 'submitted', 'submitted_at' => now()]);
        $payload = $this->actingAs($user)->getJson('/api/v1/me/identity-verification')->assertOk()->json('data');
        $this->assertArrayNotHasKey('previewUrl', $payload);
        $this->assertArrayNotHasKey('objectKey', $payload);
        $this->assertArrayNotHasKey('evidence', $payload);
    }

    public function test_guest_cannot_read_identity_status(): void
    {
        $this->getJson('/api/v1/me/identity-verification')->assertUnauthorized();
    }

    public function test_purge_command_tombstones_due_evidence(): void
    {
        $disk = (string) config('identity_verification.disk');
        Storage::fake($disk);
        $user = User::factory()->create();
        $verification = IdentityVerification::query()->create(['user_id' => $user->id, 'status' => 'approved', 'reviewed_at' => now()]);
        $consent = IdentityVerificationConsent::query()->create([
            'identity_verification_id' => $verification->id,
            'user_id' => $user->id,
            'notice_version' => 'identity-verification-1.1',
            'consent_version' => 'identity-consent-1.1',
            'privacy_policy_version' => '2026-09-11',
            'purpose' => 'identity_verification',
            'purpose_statement' => (string) config('identity_verification.purpose_statement'),
            'trigger' => 'account_settings',
            'request_id' => (string) Str::uuid(),
            'consented_at' => now(),
        ]);
        $session = IdentityVerificationSession::query()->create([
            'identity_verification_id' => $verification->id,
            'consent_id' => $consent->id,
            'token_hash' => hash('sha256', 'test-token'),
            'expires_at' => now()->addHour(),
            'used_at' => now(),
        ]);
        Storage::disk($disk)->put('quarantine/test.jpg', 'jpeg-bytes');
        $evidence = IdentityEvidence::query()->create([
            'identity_verification_id' => $verification->id,
            'session_id' => $session->id,
            'kind' => 'id_front',
            'disk' => $disk,
            'object_key' => 'quarantine/test.jpg',
            'sha256' => hash('sha256', 'jpeg-bytes'),
            'size_bytes' => 10,
            'mime_type' => 'image/jpeg',
            'scan_status' => 'clean',
            'purge_after' => now()->subMinute(),
        ]);

        Artisan::call('identity-evidence:purge');

        $fresh = $evidence->fresh();
        $this->assertNotNull($fresh->purged_at);
        $this->assertSame("purged/{$evidence->id}", $fresh->object_key);
        Storage::disk($disk)->assertMissing('quarantine/test.jpg');
    }

    /** @return array<string, mixed> */
    private function consentPayload(): array
    {
        return [
            'noticeVersion' => 'identity-verification-1.1',
            'consentVersion' => 'identity-consent-1.1',
            'privacyPolicyVersion' => '2026-09-11',
            'purpose' => 'identity_verification',
            'purposeStatement' => (string) config('identity_verification.purpose_statement'),
            'trigger' => 'account_settings',
            'consented' => true,
        ];
    }
}
