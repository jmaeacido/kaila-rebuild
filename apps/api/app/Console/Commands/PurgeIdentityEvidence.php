<?php

namespace App\Console\Commands;

use App\Models\AuditEvent;
use App\Models\IdentityEvidence;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PurgeIdentityEvidence extends Command
{
    protected $signature = 'identity-evidence:purge';

    protected $description = 'Purge identity evidence whose approved retention period has ended';

    public function handle(): int
    {
        IdentityEvidence::query()->whereNull('purged_at')->where('purge_after', '<=', now())->chunkById(100, function ($evidence): void {
            foreach ($evidence as $item) {
                Storage::disk($item->disk)->delete($item->object_key);
                $item->update(['purged_at' => now(), 'object_key' => "purged/{$item->id}", 'sha256' => str_repeat('0', 64), 'size_bytes' => 0]);
                AuditEvent::query()->create(['event_type' => 'identity.evidence_purged', 'subject_type' => 'identity_evidence', 'subject_id' => $item->id, 'metadata' => ['verificationId' => $item->identity_verification_id]]);
            }
        });

        return self::SUCCESS;
    }
}
