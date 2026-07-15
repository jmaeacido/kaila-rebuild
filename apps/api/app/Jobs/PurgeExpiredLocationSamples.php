<?php

namespace App\Jobs;

use App\Models\RetentionRun;
use App\Support\LocationRetentionService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;
use Throwable;

class PurgeExpiredLocationSamples implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $uniqueFor = 3600;

    /** @return list<int> */
    public function backoff(): array
    {
        return [60, 300];
    }

    public function handle(LocationRetentionService $retention): void
    {
        $run = RetentionRun::query()->create([
            'id' => (string) Str::uuid(),
            'policy' => 'location_samples_24_hours',
            'status' => 'running',
            'started_at' => now(),
        ]);

        try {
            $deleted = $retention->purgeExpiredSamples();
            $run->forceFill([
                'status' => 'completed',
                'deleted_records' => $deleted,
                'finished_at' => now(),
            ])->save();
        } catch (Throwable $exception) {
            $run->forceFill([
                'status' => 'failed',
                'finished_at' => now(),
                'error' => mb_substr($exception->getMessage(), 0, 500),
            ])->save();
            throw $exception;
        }
    }
}
