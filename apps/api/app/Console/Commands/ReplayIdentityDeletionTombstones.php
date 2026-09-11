<?php

namespace App\Console\Commands;

use App\Models\IdentityDeletionTombstone;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Replays deletion tombstones against a restored backup volume so purged
 * identity objects cannot reappear after restore.
 */
class ReplayIdentityDeletionTombstones extends Command
{
    protected $signature = 'identity-evidence:replay-tombstones {--dry-run : Report only}';

    protected $description = 'Delete restored identity evidence objects that have deletion tombstones';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');
        $removed = 0;
        IdentityDeletionTombstone::query()->orderBy('purged_at')->chunkById(100, function ($rows) use ($dry, &$removed): void {
            foreach ($rows as $tombstone) {
                $disk = Storage::disk($tombstone->disk);
                $candidates = array_unique(array_filter([
                    $tombstone->object_key,
                    "purged/{$tombstone->identity_evidence_id}",
                ]));
                foreach ($candidates as $key) {
                    if ($disk->exists($key)) {
                        if (! $dry) {
                            $disk->delete($key);
                        }
                        $removed++;
                        $this->line(($dry ? '[dry-run] would delete ' : 'deleted ').$tombstone->disk.':'.$key);
                    }
                }
            }
        });
        $this->info("Tombstone replay complete. Objects touched: {$removed}");

        return self::SUCCESS;
    }
}
