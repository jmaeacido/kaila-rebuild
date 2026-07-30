<?php

namespace App\Jobs;

use App\Contracts\MalwareScanner;
use App\Models\JobAsset;
use App\Models\ServiceJob;
use App\Support\JobRealtimePublisher;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
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
        DB::transaction(function () use ($asset, $result): void {
            $asset->forceFill([
                'scan_status' => $result->clean ? 'clean' : 'rejected',
                'scan_signature' => $result->signature,
                'scan_error' => null,
                'scanned_at' => now(),
            ])->save();
            $job = ServiceJob::query()->findOrFail($asset->service_job_id);
            app(JobRealtimePublisher::class)->record(
                'job.media.updated',
                $job,
                'job_asset',
                $asset->id,
                2,
                ['scanStatus' => $asset->scan_status],
            );
        });
    }

    public function failed(?Throwable $exception): void
    {
        DB::transaction(function () use ($exception): void {
            $asset = JobAsset::query()->find($this->assetId);
            if (! $asset) {
                return;
            }
            $asset->update([
                'scan_status' => 'failed',
                'scan_error' => mb_substr($exception?->getMessage() ?? 'Malware scan failed.', 0, 500),
            ]);
            $job = ServiceJob::query()->findOrFail($asset->service_job_id);
            app(JobRealtimePublisher::class)->record(
                'job.media.updated',
                $job,
                'job_asset',
                $asset->id,
                2,
                ['scanStatus' => 'failed'],
            );
        });
    }
}
