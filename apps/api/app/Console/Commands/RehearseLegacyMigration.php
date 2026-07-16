<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use JsonException;

class RehearseLegacyMigration extends Command
{
    protected $signature = 'legacy:rehearse {manifest : Path to a read-only JSON export manifest} {--report= : Reconciliation report path}';

    protected $description = 'Validate and reconcile an approved legacy core-data export without changing either database';

    /** @var list<string> */
    private const ENTITY_ORDER = ['categories', 'areas', 'users', 'provider_profiles', 'jobs', 'offers', 'reviews'];

    /** @var list<string> */
    private const EXCLUDED_KEYS = ['password', 'password_hash', 'message', 'messages', 'media', 'attachments', 'latitude', 'longitude', 'job_lat', 'job_lng'];

    /** @var array<string, string> */
    private const STATUS_MAP = [
        'Open' => 'posted', 'Posted' => 'posted', 'Offers Received' => 'offers_received',
        'Countered' => 'offers_received', 'Accepted' => 'provider_selected',
        'In Progress' => 'working', 'Provider Marked Done' => 'completion_submitted',
        'Revision Requested' => 'revision_requested', 'Disputed' => 'disputed',
        'Payment Released' => 'completed', 'Rated' => 'rated_closed',
        'Rated / Closed' => 'rated_closed', 'Cancelled' => 'cancelled',
    ];

    public function handle(): int
    {
        $path = (string) $this->argument('manifest');
        if (! is_file($path) || ! is_readable($path)) {
            $this->error('Manifest is not a readable file.');

            return self::FAILURE;
        }

        try {
            /** @var mixed $decoded */
            $decoded = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            $this->error('Manifest JSON is invalid: '.$exception->getMessage());

            return self::FAILURE;
        }

        if (! is_array($decoded)) {
            $this->error('Manifest root must be an object.');

            return self::FAILURE;
        }

        $report = $this->reconcile($decoded, $path);
        $reportPath = (string) ($this->option('report') ?: storage_path('app/migration-reports/'.now()->format('Ymd-His').'-reconciliation.json'));
        $directory = dirname($reportPath);
        if (! is_dir($directory)) {
            mkdir($directory, 0750, true);
        }
        file_put_contents($reportPath, json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR).PHP_EOL);

        $this->table(['Entity', 'Source', 'Eligible', 'Exceptions', 'Checksum'], array_map(
            fn (string $entity): array => [$entity, $report['entities'][$entity]['source_count'], $report['entities'][$entity]['eligible_count'], $report['entities'][$entity]['exception_count'], $report['entities'][$entity]['checksum']],
            self::ENTITY_ORDER,
        ));
        $this->info('Reconciliation report: '.$reportPath);

        if ($report['summary']['exception_count'] > 0) {
            $this->warn('Rehearsal completed with exceptions; cutover remains blocked.');

            return self::FAILURE;
        }

        $this->info('Rehearsal passed. This command did not mutate source or target data.');

        return self::SUCCESS;
    }

    /** @param array<string, mixed> $manifest
     * @return array<string, mixed>
     */
    private function reconcile(array $manifest, string $path): array
    {
        $exceptions = [];
        $entities = [];
        $ids = [];

        if (($manifest['schema_version'] ?? null) !== '1.0') {
            $exceptions[] = $this->exception('manifest', null, 'unsupported_schema_version', 'schema_version must equal 1.0');
        }
        if (($manifest['source']['read_only'] ?? null) !== true) {
            $exceptions[] = $this->exception('manifest', null, 'source_not_read_only', 'source.read_only must be true');
        }
        if (Arr::get($manifest, 'approvals.legal_privacy_review') !== true) {
            $exceptions[] = $this->exception('manifest', null, 'approval_missing', 'legal/privacy review approval is required');
        }

        foreach (self::ENTITY_ORDER as $entity) {
            $rows = $manifest['entities'][$entity] ?? [];
            if (! is_array($rows) || ! array_is_list($rows)) {
                $exceptions[] = $this->exception($entity, null, 'invalid_collection', 'entity collection must be a JSON array');
                $rows = [];
            }
            $eligible = [];
            $ids[$entity] = [];
            foreach ($rows as $index => $row) {
                if (! is_array($row)) {
                    $exceptions[] = $this->exception($entity, (string) $index, 'invalid_row', 'row must be an object');

                    continue;
                }
                $legacyId = isset($row['legacy_id']) ? trim((string) $row['legacy_id']) : '';
                if ($legacyId === '' || isset($ids[$entity][$legacyId])) {
                    $exceptions[] = $this->exception($entity, $legacyId ?: (string) $index, $legacyId === '' ? 'missing_legacy_id' : 'duplicate_legacy_id', 'legacy_id must be non-empty and unique per entity');

                    continue;
                }
                $ids[$entity][$legacyId] = true;
                $sensitive = array_values(array_intersect(array_keys($row), self::EXCLUDED_KEYS));
                if ($sensitive !== []) {
                    $exceptions[] = $this->exception($entity, $legacyId, 'excluded_sensitive_data', 'excluded fields present: '.implode(', ', $sensitive));

                    continue;
                }
                $eligible[] = $this->canonicalize($row);
            }
            $entities[$entity] = [
                'source_count' => count($rows),
                'eligible_count' => count($eligible),
                'exception_count' => 0,
                'checksum' => hash('sha256', json_encode($eligible, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)),
            ];
        }

        $this->validateReferences($manifest, $ids, $exceptions);
        foreach ($exceptions as $exception) {
            $entity = $exception['entity'];
            if (isset($entities[$entity])) {
                $entities[$entity]['exception_count']++;
            }
        }

        return [
            'report_version' => '1.0',
            'run_id' => (string) Str::uuid(),
            'generated_at' => now()->toIso8601String(),
            'source' => $manifest['source'] ?? null,
            'manifest_checksum' => hash_file('sha256', $path),
            'mapping_rule_version' => 'legacy-status-mapping-2026-07-16',
            'mode' => 'dry-run-read-only',
            'entities' => $entities,
            'summary' => ['source_count' => array_sum(array_column($entities, 'source_count')), 'eligible_count' => array_sum(array_column($entities, 'eligible_count')), 'exception_count' => count($exceptions), 'cutover_eligible' => $exceptions === []],
            'exceptions' => $exceptions,
        ];
    }

    /** @param array<string, mixed> $manifest
     * @param  array<string, array<string, bool>>  $ids
     * @param  list<array<string, string|null>>  $exceptions
     */
    private function validateReferences(array $manifest, array $ids, array &$exceptions): void
    {
        $references = [
            'provider_profiles' => ['user_legacy_id' => 'users'],
            'jobs' => ['client_legacy_id' => 'users', 'category_legacy_id' => 'categories', 'area_legacy_id' => 'areas'],
            'offers' => ['job_legacy_id' => 'jobs', 'provider_legacy_id' => 'provider_profiles'],
            'reviews' => ['job_legacy_id' => 'jobs', 'author_legacy_id' => 'users', 'subject_legacy_id' => 'users'],
        ];
        foreach ($references as $entity => $fields) {
            foreach (($manifest['entities'][$entity] ?? []) as $row) {
                if (! is_array($row)) {
                    continue;
                }
                foreach ($fields as $field => $target) {
                    $value = (string) ($row[$field] ?? '');
                    if ($value === '' || ! isset($ids[$target][$value])) {
                        $exceptions[] = $this->exception($entity, (string) ($row['legacy_id'] ?? ''), 'missing_reference', "$field does not reference an exported $target row");
                    }
                }
                if ($entity === 'jobs') {
                    $status = (string) ($row['legacy_status'] ?? '');
                    if (! isset(self::STATUS_MAP[$status])) {
                        $exceptions[] = $this->exception($entity, (string) ($row['legacy_id'] ?? ''), 'ambiguous_status', "legacy status '$status' requires manual mapping");
                    }
                }
            }
        }
    }

    /** @param array<string, mixed> $value
     * @return array<string, mixed>
     */
    private function canonicalize(array $value): array
    {
        ksort($value);
        foreach ($value as &$item) {
            if (is_array($item) && ! array_is_list($item)) {
                $item = $this->canonicalize($item);
            }
        }

        return $value;
    }

    /** @return array<string, string|null> */
    private function exception(string $entity, ?string $legacyId, string $code, string $message): array
    {
        return ['entity' => $entity, 'legacy_id' => $legacyId, 'code' => $code, 'message' => $message];
    }
}
