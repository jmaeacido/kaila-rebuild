<?php

namespace App\Support;

use App\Jobs\PublishOutboxEvent;
use App\Models\OutboxEvent;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use LogicException;

class OutboxRecorder
{
    /** @param array<string, mixed> $payload */
    public function record(
        string $eventType,
        string $resourceType,
        string $resourceId,
        int $resourceVersion,
        array $payload,
        ?Carbon $availableAt = null,
    ): OutboxEvent {
        if (DB::transactionLevel() < 1) {
            throw new LogicException('Outbox events must be recorded inside a database transaction.');
        }

        $event = OutboxEvent::query()->create([
            'id' => (string) Str::uuid(),
            'event_type' => $eventType,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'resource_version' => $resourceVersion,
            'payload' => $payload,
            'occurred_at' => now(),
            'available_at' => $availableAt ?? now(),
        ]);

        DB::afterCommit(fn () => PublishOutboxEvent::dispatch((string) $event->getKey())->onQueue('outbox'));

        return $event;
    }
}
