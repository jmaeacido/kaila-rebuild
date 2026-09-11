<?php

namespace Tests\Feature;

use App\Jobs\ScanIdentityEvidence;
use App\Models\AuditEvent;
use App\Models\IdentityEvidence;
use App\Models\IdentityVerification;
use App\Models\IdentityVerificationConsent;
use App\Models\IdentityVerificationSession;
use App\Models\User;
use App\Support\IdentityEvidenceCipher;
use App\Support\IdentityImageValidator;
use App\Support\SensitiveDataRedactor;
use App\Support\TotpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class IdentityVerificationProductionControlsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('identity_verification.capture_enabled', true);
        config()->set('identity_verification.enforcement_enabled', false);
        config()->set('identity_verification.rollout_percent', 100);
        config()->set('identity_verification.allowlist_user_ids', []);
        config()->set('identity_verification.allowlist_emails', []);
        config()->set('identity_verification.encrypt_at_rest', true);
        config()->set('identity_verification.fail_closed', true);
        config()->set('identity_verification.notice_version', 'identity-verification-1.1');
        config()->set('identity_verification.consent_version', 'identity-consent-1.1');
        config()->set('identity_verification.privacy_policy_version', '2026-09-11');
        Storage::fake((string) config('identity_verification.disk'));
    }

    public function test_mfa_is_required_before_evidence_preview(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create();
        [$evidence] = $this->seedCleanEvidence($user);

        $this->actingAs($admin)
            ->get('/api/v1/admin/marketplace/identity-verifications/evidence/'.$evidence->id.'/preview?reason=initial_review')
            ->assertForbidden();
    }

    public function test_mfa_challenge_unlocks_preview_and_blocks_other_users(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'email' => 'admin@kaila-app.com']);
        $outsider = User::factory()->create();
        $subject = User::factory()->create();
        [$evidence] = $this->seedCleanEvidence($subject);
        $totp = app(TotpService::class);
        $secret = $totp->generateSecret();
        $admin->forceFill([
            'mfa_secret' => encrypt($secret),
            'mfa_confirmed_at' => now(),
            'mfa_recovery_codes' => [],
        ])->save();

        $this->actingAs($admin)
            ->postJson('/api/v1/admin/marketplace/mfa/challenge', ['code' => $totp->codeAt($secret, (int) floor(time() / 30))])
            ->assertOk()
            ->assertJsonPath('data.sessionVerified', true);

        $this->actingAs($admin)
            ->get('/api/v1/admin/marketplace/identity-verifications/evidence/'.$evidence->id.'/preview?reason=initial_review')
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg');

        $this->actingAs($outsider)
            ->get('/api/v1/admin/marketplace/identity-verifications/evidence/'.$evidence->id.'/preview?reason=initial_review')
            ->assertForbidden();
    }

    public function test_member_cannot_read_another_users_verification_or_evidence_urls(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        IdentityVerification::query()->create(['user_id' => $owner->id, 'status' => 'submitted', 'submitted_at' => now()]);

        $payload = $this->actingAs($other)->getJson('/api/v1/me/identity-verification')->assertOk()->json('data');
        $this->assertSame('not_started', $payload['status']);
        $this->assertArrayNotHasKey('evidence', $payload);
    }

    public function test_upload_rejects_svg_and_html_polyglots(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        $session = $this->consentSession($user);
        $svg = UploadedFile::fake()->createWithContent('id.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
        $this->actingAs($user)->post('/api/v1/me/identity-verification/submit', [
            'sessionId' => $session['sessionId'],
            'uploadToken' => $session['uploadToken'],
            'idType' => 'philid',
            'issuingCountry' => 'PH',
            'idFront' => $svg,
            'selfie' => UploadedFile::fake()->image('selfie.jpg', 320, 320),
            'selfieCapturedNow' => '1',
        ], ['Accept' => 'application/json'])->assertStatus(422);
    }

    public function test_upload_stores_encrypted_quarantine_object_with_generated_key(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        $session = $this->consentSession($user);
        $this->actingAs($user)->post('/api/v1/me/identity-verification/submit', [
            'sessionId' => $session['sessionId'],
            'uploadToken' => $session['uploadToken'],
            'idType' => 'philid',
            'issuingCountry' => 'PH',
            'idFront' => UploadedFile::fake()->image('id-front.jpg', 640, 480),
            'selfie' => UploadedFile::fake()->image('selfie.jpg', 640, 480),
            'selfieCapturedNow' => '1',
        ], ['Accept' => 'application/json'])->assertCreated();

        $evidence = IdentityEvidence::query()->firstOrFail();
        $this->assertTrue($evidence->encrypted_at_rest);
        $this->assertStringStartsWith("quarantine/{$evidence->identity_verification_id}/", $evidence->object_key);
        $this->assertStringEndsWith('.jpg', $evidence->object_key);
        $payload = Storage::disk($evidence->disk)->get($evidence->object_key);
        $this->assertNotSame($payload, '');
        $this->assertFalse(@imagecreatefromstring($payload) !== false && imagecreatefromstring($payload) !== false);
        // Ciphertext must not be a bare JPEG; decrypt before decoding.
        $this->assertSame(false, @imagecreatefromstring($payload));
        $plain = app(IdentityEvidenceCipher::class)->decrypt($payload);
        $this->assertNotFalse(@imagecreatefromstring($plain));
        Queue::assertPushed(ScanIdentityEvidence::class);
    }

    public function test_allowlist_gates_capture_when_percent_is_zero(): void
    {
        config()->set('identity_verification.rollout_percent', 0);
        config()->set('identity_verification.allowlist_emails', ['allowed@kaila-app.com']);
        $blocked = User::factory()->create(['email' => 'blocked@kaila-app.com']);
        $allowed = User::factory()->create(['email' => 'allowed@kaila-app.com']);

        $this->actingAs($blocked)->getJson('/api/v1/me/identity-verification')
            ->assertOk()->assertJsonPath('data.captureAvailable', false);
        $this->actingAs($allowed)->getJson('/api/v1/me/identity-verification')
            ->assertOk()->assertJsonPath('data.captureAvailable', true);
    }

    public function test_audit_events_are_append_only_and_exclude_raw_evidence(): void
    {
        $user = User::factory()->create();
        $this->consentSession($user);
        $event = AuditEvent::query()->where('event_type', 'identity.consent_given')->firstOrFail();
        $this->assertArrayNotHasKey('idFront', $event->metadata ?? []);
        $this->assertArrayNotHasKey('selfie', $event->metadata ?? []);
        $this->expectException(\RuntimeException::class);
        $event->update(['event_type' => 'tampered']);
    }

    public function test_purge_writes_tombstone_and_replay_removes_restored_object(): void
    {
        $user = User::factory()->create();
        [$evidence] = $this->seedCleanEvidence($user);
        $disk = $evidence->disk;
        $key = $evidence->object_key;
        $evidence->update(['purge_after' => now()->subMinute()]);

        Artisan::call('identity-evidence:purge');
        $this->assertNotNull($evidence->fresh()->purged_at);
        $this->assertDatabaseHas('identity_deletion_tombstones', ['identity_evidence_id' => $evidence->id]);
        Storage::disk($disk)->assertMissing($key);

        // Simulate restored backup object reappearing under the old key.
        Storage::disk($disk)->put($key, 'restored-bytes');
        Artisan::call('identity-evidence:replay-tombstones');
        Storage::disk($disk)->assertMissing($key);
    }

    public function test_legal_hold_blocks_purge_until_released(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'email' => 'hold-admin@kaila-app.com']);
        $subject = User::factory()->create();
        [$evidence, $verification] = $this->seedCleanEvidence($subject);
        $totp = app(TotpService::class);
        $secret = $totp->generateSecret();
        $admin->forceFill(['mfa_secret' => encrypt($secret), 'mfa_confirmed_at' => now(), 'mfa_recovery_codes' => []])->save();
        $this->actingAs($admin)->postJson('/api/v1/admin/marketplace/mfa/challenge', [
            'code' => $totp->codeAt($secret, (int) floor(time() / 30)),
        ])->assertOk();

        $hold = $this->actingAs($admin)->postJson("/api/v1/admin/marketplace/identity-verifications/{$verification->id}/holds", [
            'caseReference' => 'CASE-1',
            'reason' => 'Active fraud investigation',
        ])->assertCreated()->json('data.id');

        $evidence->refresh()->update(['purge_after' => now()->subMinute()]);
        Artisan::call('identity-evidence:purge');
        $this->assertNull($evidence->fresh()->purged_at);

        $this->actingAs($admin)->postJson("/api/v1/admin/marketplace/identity-legal-holds/{$hold}/release", [
            'releaseReason' => 'Investigation closed',
        ])->assertOk();
        $evidence->refresh()->update(['purge_after' => now()->subMinute()]);
        Artisan::call('identity-evidence:purge');
        $this->assertNotNull($evidence->fresh()->purged_at);
    }

    public function test_sensitive_redactor_covers_identity_keys(): void
    {
        $redacted = (new SensitiveDataRedactor)->redact([
            'idFront' => 'x',
            'signed_url' => 'https://example',
            'otpauthUrl' => 'otpauth://',
            'safe' => 'ok',
        ]);
        $this->assertSame('[REDACTED]', $redacted['idFront']);
        $this->assertSame('[REDACTED]', $redacted['signed_url']);
        $this->assertSame('[REDACTED]', $redacted['otpauthUrl']);
        $this->assertSame('ok', $redacted['safe']);
    }

    public function test_image_validator_rejects_html_named_as_jpg(): void
    {
        $tmp = tempnam(sys_get_temp_dir(), 'id');
        file_put_contents($tmp, '<html><body>nope</body></html>');
        $file = new UploadedFile($tmp, 'id.jpg', 'image/jpeg', null, true);
        try {
            app(IdentityImageValidator::class)->validateAndRead($file, 10240);
            $this->fail('Expected abort');
        } catch (HttpException $exception) {
            $this->assertSame(422, $exception->getStatusCode());
        } finally {
            @unlink($tmp);
        }
    }

    /** @return array{sessionId: string, uploadToken: string} */
    private function consentSession(User $user): array
    {
        return $this->actingAs($user)->postJson('/api/v1/me/identity-verification/consent', [
            'noticeVersion' => 'identity-verification-1.1',
            'consentVersion' => 'identity-consent-1.1',
            'privacyPolicyVersion' => '2026-09-11',
            'purpose' => 'identity_verification',
            'purposeStatement' => (string) config('identity_verification.purpose_statement'),
            'trigger' => 'account_settings',
            'consented' => true,
        ])->assertCreated()->json('data');
    }

    /** @return array{0: IdentityEvidence, 1: IdentityVerification} */
    private function seedCleanEvidence(User $user): array
    {
        $verification = IdentityVerification::query()->create([
            'user_id' => $user->id,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);
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
            'token_hash' => hash('sha256', 'token'),
            'expires_at' => now()->addHour(),
            'used_at' => now(),
        ]);
        $disk = (string) config('identity_verification.disk');
        $key = "quarantine/{$verification->id}/".Str::uuid().'.jpg';
        $jpegFile = UploadedFile::fake()->image('id.jpg', 200, 200);
        $jpeg = (string) file_get_contents($jpegFile->getRealPath());
        Storage::disk($disk)->put($key, app(IdentityEvidenceCipher::class)->encrypt($jpeg));
        $evidence = IdentityEvidence::query()->create([
            'identity_verification_id' => $verification->id,
            'session_id' => $session->id,
            'kind' => 'id_front',
            'disk' => $disk,
            'encrypted_at_rest' => true,
            'object_key' => $key,
            'mime_type' => 'image/jpeg',
            'size_bytes' => strlen($jpeg),
            'sha256' => hash('sha256', $jpeg),
            'scan_status' => 'clean',
            'purge_after' => now()->addDay(),
        ]);

        return [$evidence, $verification];
    }
}
