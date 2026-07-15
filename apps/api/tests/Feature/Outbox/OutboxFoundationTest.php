<?php

namespace Tests\Feature\Outbox;

use App\Contracts\OutboxTransport;
use App\Jobs\PublishOutboxEvent;
use App\Models\OutboxEvent;
use App\Support\OutboxRecorder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class OutboxFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_event_is_rolled_back_with_the_domain_transaction(): void
    {
        $recorder = $this->app->make(OutboxRecorder::class);

        try {
            DB::transaction(function () use ($recorder): void {
                $recorder->record('job.created', 'job', 'job-1', 1, ['status' => 'open']);
                throw new RuntimeException('Roll back the domain change.');
            });
        } catch (RuntimeException) {
            // Expected rollback.
        }

        $this->assertDatabaseCount('outbox_events', 0);
    }

    public function test_recorded_event_has_stable_envelope_and_payload(): void
    {
        $event = DB::transaction(fn () => $this->app->make(OutboxRecorder::class)->record(
            'job.created',
            'job',
            'job-1',
            1,
            ['status' => 'open'],
        ));

        $this->assertTrue(Str::isUuid((string) $event->getKey()));
        $this->assertSame(['status' => 'open'], $event->payload);
        $this->assertSame(0, $event->attempts);
        $this->assertNull($event->published_at);
    }

    public function test_publication_is_idempotent_for_an_already_published_event(): void
    {
        $event = $this->event();
        $transport = new RecordingOutboxTransport;
        $job = new PublishOutboxEvent((string) $event->getKey());

        $job->handle($transport);
        $job->handle($transport);

        $this->assertSame([(string) $event->getKey()], $transport->publishedEventIds);
        $this->assertSame(1, $event->fresh()->attempts);
        $this->assertNotNull($event->fresh()->published_at);
    }

    public function test_failed_publication_is_recoverable_and_tracks_attempts_without_payload_logging(): void
    {
        $event = $this->event(['privateMessage' => 'must-not-be-logged']);
        $job = new PublishOutboxEvent((string) $event->getKey());
        $failing = new RecordingOutboxTransport(fail: true);

        try {
            $job->handle($failing);
            $this->fail('The transport failure should be rethrown for queue retry.');
        } catch (RuntimeException) {
            // Expected: Laravel will retry using the job's bounded backoff.
        }

        $failed = $event->fresh();
        $this->assertSame(1, $failed->attempts);
        $this->assertNull($failed->processing_at);
        $this->assertSame('Transport unavailable.', $failed->last_error);

        $successful = new RecordingOutboxTransport;
        $job->handle($successful);
        $this->assertSame(2, $event->fresh()->attempts);
        $this->assertNotNull($event->fresh()->published_at);
    }

    public function test_dispatch_command_enqueues_only_ready_unpublished_events(): void
    {
        Queue::fake();
        $ready = $this->event();
        $this->event(availableAt: now()->addMinute());
        $this->event(publishedAt: now());

        $this->artisan('outbox:dispatch')->expectsOutput('Enqueued 1 outbox event(s).')->assertSuccessful();

        Queue::assertPushedOn('outbox', PublishOutboxEvent::class);
        Queue::assertPushed(PublishOutboxEvent::class, fn (PublishOutboxEvent $job) => $job->eventId === $ready->getKey());
    }

    /** @param array<string, mixed> $payload */
    private function event(
        array $payload = ['status' => 'open'],
        ?Carbon $availableAt = null,
        ?Carbon $publishedAt = null,
    ): OutboxEvent {
        return OutboxEvent::query()->create([
            'event_type' => 'job.created',
            'resource_type' => 'job',
            'resource_id' => (string) Str::uuid(),
            'resource_version' => 1,
            'payload' => $payload,
            'occurred_at' => now(),
            'available_at' => $availableAt ?? now(),
            'published_at' => $publishedAt,
        ]);
    }
}

class RecordingOutboxTransport implements OutboxTransport
{
    /** @var list<string> */
    public array $publishedEventIds = [];

    public function __construct(private readonly bool $fail = false) {}

    public function publish(OutboxEvent $event): void
    {
        if ($this->fail) {
            throw new RuntimeException('Transport unavailable.');
        }

        $this->publishedEventIds[] = (string) $event->getKey();
    }
}
