<?php

namespace App\Console\Commands;

use App\Models\AuditEvent;
use App\Models\IdentityDeletionTombstone;
use App\Models\IdentityEvidence;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PurgeIdentityEvidence extends Command
{
    protected $signature = 'identity-evidence:purge';

    protected $description = 'Purge identity evidence whose approved retention period has ended';

    public function handle(): int
    {
        $key = (string) config('app.key');
        $systemHash = hash_hmac('sha256', 'identity-evidence:purge', $key);

        IdentityEvidence::query()
            ->whereNull('purged_at')
            ->whereNull('legal_hold_at')
            ->where('purge_after', '<=', now())
            ->chunkById(100, function ($evidence) use ($systemHash): void {
                foreach ($evidence as $item) {
                    $originalKey = $item->object_key;
                    Storage::disk($item->disk)->delete($originalKey);
                    $tombstoneKey = "purged/{$item->id}";
                    $item->update([
                        'purged_at' => now(),
                        'object_key' => $tombstoneKey,
                        'sha256' => str_repeat('0', 64),
                        'size_bytes' => 0,
                    ]);
                    IdentityDeletionTombstone::query()->updateOrCreate(
                        ['identity_evidence_id' => $item->id],
                        [
                            'identity_verification_id' => $item->identity_verification_id,
                            'disk' => $item->disk,
                            'object_key' => $originalKey,
                            'purged_at' => now(),
                        ],
                    );
                    AuditEvent::query()->create([
                        'event_type' => 'identity.evidence_purged',
                        'request_id' => (string) Str::uuid(),
                        'subject_type' => 'identity_evidence',
                        'subject_id' => $item->id,
                        'ip_hash' => $systemHash,
                        'user_agent_hash' => $systemHash,
                        'metadata' => [
                            'verificationId' => $item->identity_verification_id,
                            'source' => 'identity-evidence:purge',
                        ],
                    ]);
                }
            });

        return self::SUCCESS;
    }
}
