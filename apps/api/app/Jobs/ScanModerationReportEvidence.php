<?php

namespace App\Jobs;

use App\Contracts\MalwareScanner;
use App\Models\ModerationReportEvidence;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class ScanModerationReportEvidence implements ShouldBeUnique, ShouldQueue
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

    public function handle(MalwareScanner $scanner): void
    {
        $evidence = ModerationReportEvidence::query()->findOrFail($this->evidenceId);
        if (! in_array($evidence->scan_status, ['pending', 'failed'], true)) {
            return;
        }
        $stream = Storage::disk($evidence->disk)->readStream($evidence->object_key);
        if (! is_resource($stream)) {
            throw new RuntimeException('The quarantined safety evidence could not be opened.');
        }
        try {
            $result = $scanner->scan($stream);
        } finally {
            fclose($stream);
        }
        $evidence->update(['scan_status' => $result->clean ? 'clean' : 'rejected']);
    }

    public function failed(?Throwable $exception): void
    {
        ModerationReportEvidence::query()->whereKey($this->evidenceId)->update(['scan_status' => 'failed']);
    }
}
