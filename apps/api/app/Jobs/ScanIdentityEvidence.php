<?php

namespace App\Jobs;

use App\Contracts\MalwareScanner;
use App\Models\IdentityEvidence;
use App\Support\IdentityEvidenceCipher;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class ScanIdentityEvidence implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public int $timeout = 60;

    public int $uniqueFor = 600;

    public function __construct(public readonly string $evidenceId)
    {
        $this->onQueue('maintenance');
    }

    public function uniqueId(): string
    {
        return $this->evidenceId;
    }

    /** @return list<int> */
    public function backoff(): array
    {
        return [5, 30, 120, 300];
    }

    public function handle(MalwareScanner $scanner, IdentityEvidenceCipher $cipher): void
    {
        $evidence = IdentityEvidence::query()->findOrFail($this->evidenceId);
        if (! in_array($evidence->scan_status, ['pending', 'failed'], true)) {
            return;
        }
        $payload = Storage::disk($evidence->disk)->get($evidence->object_key);
        if ($payload === null) {
            throw new RuntimeException('The quarantined identity evidence could not be opened.');
        }
        $bytes = $evidence->encrypted_at_rest ? $cipher->decrypt($payload) : $payload;
        $stream = fopen('php://temp', 'r+b');
        if ($stream === false) {
            throw new RuntimeException('Unable to allocate a scan buffer.');
        }
        try {
            fwrite($stream, $bytes);
            rewind($stream);
            $result = $scanner->scan($stream);
        } finally {
            fclose($stream);
        }
        $evidence->update([
            'scan_status' => $result->clean ? 'clean' : 'rejected',
            'scan_signature' => $result->signature,
            'scan_error' => null,
            'scanned_at' => now(),
        ]);
    }

    public function failed(?Throwable $exception): void
    {
        IdentityEvidence::query()->whereKey($this->evidenceId)->update([
            'scan_status' => 'failed',
            'scan_error' => mb_substr($exception?->getMessage() ?? 'Malware scan failed.', 0, 500),
        ]);
    }
}
