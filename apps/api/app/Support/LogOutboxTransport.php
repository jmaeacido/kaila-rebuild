<?php

namespace App\Support;

use App\Contracts\OutboxTransport;
use App\Models\OutboxEvent;
use Illuminate\Support\Facades\Log;

class LogOutboxTransport implements OutboxTransport
{
    public function publish(OutboxEvent $event): void
    {
        Log::info('outbox.event_published', [
            'event_id' => $event->getKey(),
            'event_type' => $event->event_type,
            'resource_type' => $event->resource_type,
            'resource_id_hash' => hash_hmac('sha256', $event->resource_id, (string) config('app.key')),
            'resource_version' => $event->resource_version,
        ]);
    }
}
