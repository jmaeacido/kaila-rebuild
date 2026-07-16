<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class LegacyMigrationRehearsalTest extends TestCase
{
    use RefreshDatabase;

    public function test_approved_core_manifest_produces_repeatable_reconciliation_without_database_writes(): void
    {
        $manifest = $this->manifest();
        $input = storage_path('framework/testing/legacy-manifest.json');
        $first = storage_path('framework/testing/legacy-report-one.json');
        $second = storage_path('framework/testing/legacy-report-two.json');
        file_put_contents($input, json_encode($manifest, JSON_THROW_ON_ERROR));

        $this->assertSame(0, Artisan::call('legacy:rehearse', ['manifest' => $input, '--report' => $first]));
        $this->assertSame(0, Artisan::call('legacy:rehearse', ['manifest' => $input, '--report' => $second]));

        $one = json_decode((string) file_get_contents($first), true, 512, JSON_THROW_ON_ERROR);
        $two = json_decode((string) file_get_contents($second), true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($one['summary']['cutover_eligible']);
        $this->assertSame(7, $one['summary']['eligible_count']);
        $this->assertSame($one['manifest_checksum'], $two['manifest_checksum']);
        $this->assertSame(array_column($one['entities'], 'checksum'), array_column($two['entities'], 'checksum'));
        $this->assertDatabaseCount('users', 0);
    }

    public function test_sensitive_ambiguous_or_orphaned_data_blocks_cutover(): void
    {
        $manifest = $this->manifest();
        $manifest['approvals']['legal_privacy_review'] = false;
        $manifest['entities']['users'][0]['password_hash'] = 'must-not-migrate';
        $manifest['entities']['jobs'][0]['legacy_status'] = 'Resolved';
        $manifest['entities']['offers'][0]['provider_legacy_id'] = 'missing';
        $input = storage_path('framework/testing/blocked-legacy-manifest.json');
        $report = storage_path('framework/testing/blocked-legacy-report.json');
        file_put_contents($input, json_encode($manifest, JSON_THROW_ON_ERROR));

        $this->assertSame(1, Artisan::call('legacy:rehearse', ['manifest' => $input, '--report' => $report]));
        $decoded = json_decode((string) file_get_contents($report), true, 512, JSON_THROW_ON_ERROR);
        $this->assertFalse($decoded['summary']['cutover_eligible']);
        $this->assertContains('excluded_sensitive_data', array_column($decoded['exceptions'], 'code'));
        $this->assertContains('ambiguous_status', array_column($decoded['exceptions'], 'code'));
        $this->assertContains('missing_reference', array_column($decoded['exceptions'], 'code'));
        $this->assertContains('approval_missing', array_column($decoded['exceptions'], 'code'));
    }

    /** @return array<string, mixed> */
    private function manifest(): array
    {
        return [
            'schema_version' => '1.0',
            'source' => ['environment' => 'sanitized-rehearsal', 'exported_at' => '2026-07-16T00:00:00+08:00', 'read_only' => true],
            'approvals' => ['legal_privacy_review' => true],
            'entities' => [
                'categories' => [['legacy_id' => 'cat-1', 'name' => 'Plumbing', 'target_slug' => 'plumbing']],
                'areas' => [['legacy_id' => 'area-1', 'name' => 'Manila', 'target_code' => 'NCR-MNL']],
                'users' => [['legacy_id' => 'user-1', 'email' => 'client@example.test', 'name' => 'Client', 'claim_required' => true]],
                'provider_profiles' => [['legacy_id' => 'provider-1', 'user_legacy_id' => 'user-1', 'display_name' => 'Provider']],
                'jobs' => [['legacy_id' => 'job-1', 'client_legacy_id' => 'user-1', 'category_legacy_id' => 'cat-1', 'area_legacy_id' => 'area-1', 'legacy_status' => 'Posted']],
                'offers' => [['legacy_id' => 'offer-1', 'job_legacy_id' => 'job-1', 'provider_legacy_id' => 'provider-1', 'amount_centavos' => 125000]],
                'reviews' => [['legacy_id' => 'review-1', 'job_legacy_id' => 'job-1', 'author_legacy_id' => 'user-1', 'subject_legacy_id' => 'user-1', 'rating' => 5]],
            ],
        ];
    }
}
