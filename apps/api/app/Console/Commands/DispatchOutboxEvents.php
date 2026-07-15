<?php

namespace App\Console\Commands;

use App\Jobs\PublishOutboxEvent;
use App\Models\OutboxEvent;
use Illuminate\Console\Command;

class DispatchOutboxEvents extends Command
{
    protected $signature = 'outbox:dispatch {--limit= : Maximum events to enqueue}';

    protected $description = 'Enqueue committed outbox events that are ready for publication';

    public function handle(): int
    {
        $limit = max(1, (int) ($this->option('limit') ?: config('outbox.dispatch_batch_size')));
        $staleBefore = now()->subSeconds((int) config('outbox.processing_timeout_seconds'));
        $eventIds = OutboxEvent::query()
            ->whereNull('published_at')
            ->where('available_at', '<=', now())
            ->where(fn ($query) => $query->whereNull('processing_at')->orWhere('processing_at', '<=', $staleBefore))
            ->oldest('occurred_at')
            ->limit($limit)
            ->pluck('id');

        foreach ($eventIds as $eventId) {
            PublishOutboxEvent::dispatch((string) $eventId)->onQueue('outbox');
        }

        $this->info(sprintf('Enqueued %d outbox event(s).', $eventIds->count()));

        return self::SUCCESS;
    }
}
