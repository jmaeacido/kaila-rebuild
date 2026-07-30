<?php

namespace App\Jobs;

use App\Contracts\MalwareScanner;
use App\Models\JobAsset;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class ScanJobAsset implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public int $timeout = 60;

    public int $uniqueFor = 600;

    public function __construct(public readonly string $assetId)
    {
        $this->onQueue('maintenance');
    }

    /** @return list<int> */
    public function backoff(): array
    {
        return [5, 30, 120, 300];
    }

    public function uniqueId(): string
    {
        return $this->assetId;
    }

    public function handle(MalwareScanner $scanner): void
    {
        $asset = JobAsset::query()->findOrFail($this->assetId);
        if (! in_array($asset->scan_status, ['pending', 'failed'], true)) {
            return;
        }
        $stream = Storage::disk($asset->disk)->readStream($asset->object_key);
        if (! is_resource($stream)) {
            throw new RuntimeException('The quarantined job asset could not be opened.');
        }
        try {
            $result = $scanner->scan($stream);
        } finally {
            fclose($stream);
        }
        $asset->forceFill([
            'scan_status' => $result->clean ? 'clean' : 'rejected',
            'scan_signature' => $result->signature,
            'scan_error' => null,
            'scanned_at' => now(),
        ])->save();
    }

    public function failed(?Throwable $exception): void
    {
        JobAsset::query()->whereKey($this->assetId)->update([
            'scan_status' => 'failed',
            'scan_error' => mb_substr($exception?->getMessage() ?? 'Malware scan failed.', 0, 500),
        ]);
    }
}
