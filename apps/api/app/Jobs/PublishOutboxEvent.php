<?php

namespace App\Jobs;

use App\Contracts\OutboxTransport;
use App\Models\OutboxEvent;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class PublishOutboxEvent implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public int $uniqueFor = 300;

    public function __construct(public readonly string $eventId) {}

    /** @return list<int> */
    public function backoff(): array
    {
        return [5, 30, 120, 300];
    }

    public function uniqueId(): string
    {
        return $this->eventId;
    }

    public function handle(OutboxTransport $transport): void
    {
        Log::withContext(['event_id' => $this->eventId, 'queue' => 'outbox']);
        $event = $this->claim();
        if (! $event) {
            return;
        }

        try {
            $transport->publish($event);
            OutboxEvent::query()->whereKey($this->eventId)->whereNull('published_at')->update([
                'published_at' => now(),
                'processing_at' => null,
                'failed_at' => null,
                'last_error' => null,
            ]);
        } catch (Throwable $exception) {
            OutboxEvent::query()->whereKey($this->eventId)->whereNull('published_at')->update([
                'processing_at' => null,
                'last_error' => mb_substr($exception->getMessage(), 0, 500),
            ]);

            throw $exception;
        }
    }

    public function failed(?Throwable $exception): void
    {
        OutboxEvent::query()->whereKey($this->eventId)->whereNull('published_at')->update([
            'processing_at' => null,
            'failed_at' => now(),
            'last_error' => mb_substr($exception?->getMessage() ?? 'Queue job failed.', 0, 500),
        ]);
    }

    private function claim(): ?OutboxEvent
    {
        return DB::transaction(function (): ?OutboxEvent {
            $event = OutboxEvent::query()->lockForUpdate()->find($this->eventId);
            if (! $event || $event->published_at || $event->available_at->isFuture()) {
                return null;
            }

            $processingCutoff = now()->subSeconds((int) config('outbox.processing_timeout_seconds'));
            if ($event->processing_at && $event->processing_at->isAfter($processingCutoff)) {
                return null;
            }

            $event->forceFill([
                'processing_at' => now(),
                'attempts' => $event->attempts + 1,
                'failed_at' => null,
            ])->save();

            return $event->fresh();
        });
    }
}
