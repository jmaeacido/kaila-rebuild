<?php

namespace Tests\Feature\Outbox;

use App\Models\OutboxEvent;
use App\Support\RedisRealtimeOutboxTransport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Redis;
use LogicException;
use Tests\TestCase;

class RedisRealtimeOutboxTransportTest extends TestCase
{
    use RefreshDatabase;

    public function test_transport_publishes_validated_envelope_and_server_owned_recipients(): void
    {
        $event = $this->event([
            'recipientUserIds' => ['42', '84'],
            'data' => ['status' => 'accepted'],
        ]);
        Redis::shouldReceive('publish')->once()->withArgs(function (string $channel, string $message) use ($event): bool {
            /** @var array{event: array<string, mixed>, recipientUserIds: list<string>} $publication */
            $publication = json_decode($message, true, flags: JSON_THROW_ON_ERROR);

            return $channel === 'kaila:realtime:events'
                && $publication['event']['eventId'] === $event->getKey()
                && $publication['event']['data'] === ['status' => 'accepted']
                && $publication['recipientUserIds'] === ['42', '84'];
        })->andReturn(2);

        (new RedisRealtimeOutboxTransport)->publish($event);
    }

    public function test_transport_rejects_event_without_bounded_recipient_audience(): void
    {
        $event = $this->event(['data' => ['status' => 'accepted']]);

        $this->expectException(LogicException::class);
        (new RedisRealtimeOutboxTransport)->publish($event);
    }

    /** @param array<string, mixed> $payload */
    private function event(array $payload): OutboxEvent
    {
        return OutboxEvent::query()->create([
            'event_type' => 'job.updated',
            'resource_type' => 'job',
            'resource_id' => 'job-1',
            'resource_version' => 2,
            'payload' => $payload,
            'occurred_at' => now(),
            'available_at' => now(),
        ]);
    }
}
