<?php

namespace App\Jobs;

use App\Contracts\MalwareScanner;
use App\Models\ConversationMessage;
use App\Models\JobConversation;
use App\Models\MessageAsset;
use App\Models\ServiceJob;
use App\Support\JobRealtimePublisher;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class ScanMessageAsset implements ShouldBeUnique, ShouldQueue
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
        $asset = MessageAsset::query()->findOrFail($this->assetId);
        if (! in_array($asset->scan_status, ['pending', 'failed'], true)) {
            return;
        }
        $stream = Storage::disk($asset->disk)->readStream($asset->object_key);
        if (! is_resource($stream)) {
            throw new RuntimeException('The quarantined message attachment could not be opened.');
        }
        try {
            $result = $scanner->scan($stream);
        } finally {
            fclose($stream);
        }
        DB::transaction(function () use ($asset, $result): void {
            $asset->update(['scan_status' => $result->clean ? 'clean' : 'rejected']);
            $this->publish($asset);
        });
    }

    public function failed(?Throwable $exception): void
    {
        DB::transaction(function (): void {
            $asset = MessageAsset::query()->find($this->assetId);
            if (! $asset) {
                return;
            }
            $asset->update(['scan_status' => 'failed']);
            $this->publish($asset);
        });
    }

    private function publish(MessageAsset $asset): void
    {
        $message = ConversationMessage::query()->findOrFail($asset->message_id);
        $conversation = JobConversation::query()->findOrFail($message->conversation_id);
        $job = ServiceJob::query()->findOrFail($conversation->service_job_id);
        app(JobRealtimePublisher::class)->record('message.asset.updated', $job, 'message_asset', $asset->id, 1, ['scanStatus' => $asset->scan_status]);
    }
}
