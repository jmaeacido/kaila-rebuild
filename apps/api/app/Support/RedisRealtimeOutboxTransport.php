<?php

namespace App\Support;

use App\Contracts\OutboxTransport;
use App\Models\OutboxEvent;
use Illuminate\Support\Facades\Redis;
use JsonException;
use LogicException;

class RedisRealtimeOutboxTransport implements OutboxTransport
{
    /** @throws JsonException */
    public function publish(OutboxEvent $event): void
    {
        $recipientUserIds = $event->payload['recipientUserIds'] ?? null;
        $data = $event->payload['data'] ?? null;
        if ((! is_array($recipientUserIds) || ! is_array($data)) && is_array($event->payload['rooms'] ?? null)) {
            $recipientUserIds = array_values(array_filter(array_map(
                static fn (mixed $room): ?string => is_string($room) && str_starts_with($room, 'user:')
                    ? substr($room, strlen('user:'))
                    : null,
                $event->payload['rooms'],
            )));
            $data = $event->payload;
            unset($data['rooms']);
        }
        if (! is_array($recipientUserIds) || $recipientUserIds === [] || count($recipientUserIds) > 100 || ! is_array($data)) {
            throw new LogicException('Realtime outbox payloads require data and between 1 and 100 recipient user IDs.');
        }

        $publication = [
            'event' => [
                'eventId' => (string) $event->getKey(),
                'type' => $event->event_type,
                'occurredAt' => $event->occurred_at->toIso8601String(),
                'resourceType' => $event->resource_type,
                'resourceId' => $event->resource_id,
                'version' => $event->resource_version,
                'data' => $data,
            ],
            'recipientUserIds' => array_values(array_map('strval', $recipientUserIds)),
        ];

        Redis::publish(
            (string) config('outbox.realtime_channel'),
            json_encode($publication, JSON_THROW_ON_ERROR),
        );
    }
}
