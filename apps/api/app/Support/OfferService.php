<?php

namespace App\Support;

use App\Jobs\DeliverPushNotification;
use App\Models\AcceptedOfferSnapshot;
use App\Models\DurableNotification;
use App\Models\JobOpportunity;
use App\Models\OfferRevision;
use App\Models\OfferThread;
use App\Models\ProviderProfile;
use App\Models\PushDeliveryAttempt;
use App\Models\PushDevice;
use App\Models\ServiceJob;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OfferService
{
    public function __construct(private readonly OutboxRecorder $outbox) {}

    /** @param array<string, mixed> $terms */
    public function create(ServiceJob $job, ProviderProfile $provider, User $actor, array $terms): OfferThread
    {
        return DB::transaction(function () use ($job, $provider, $actor, $terms): OfferThread {
            $locked = ServiceJob::query()->lockForUpdate()->findOrFail($job->id);
            abort_unless(in_array($locked->status, ['posted', 'offers_received'], true), 409, 'This job is not accepting offers.');
            abort_if($locked->client_user_id === $actor->id, 403);
            abort_unless(JobOpportunity::query()->where('service_job_id', $locked->id)->where('provider_profile_id', $provider->id)->whereIn('state', ['new', 'seen'])->exists(), 403);
            $existing = OfferThread::query()->where('service_job_id', $locked->id)->where('provider_profile_id', $provider->id)->with('revisions')->first();
            if ($existing instanceof OfferThread) {
                $first = $existing->revisions->first();
                abort_unless($first instanceof OfferRevision && $this->sameTerms($first, $terms), 409, 'An offer thread already exists.');

                return $existing->load('provider');
            }

            $thread = OfferThread::query()->create(['service_job_id' => $locked->id, 'provider_profile_id' => $provider->id, 'status' => 'active', 'latest_revision_number' => 1]);
            $revision = $this->revision($thread, $actor, $terms, 1);
            if ($locked->status === 'posted') {
                $locked->update(['status' => 'offers_received', 'version' => $locked->version + 1]);
                $locked->timeline()->create(['id' => (string) Str::uuid(), 'actor_user_id' => $actor->id, 'event_type' => 'job.offers_received', 'job_version' => $locked->version, 'metadata' => ['offerThreadId' => $thread->id], 'occurred_at' => now()]);
            }
            $this->notify($locked->client_user_id, 'offer.created', 'You received an offer', $provider->display_name.' sent an offer.', $locked, $revision);

            return $thread->load(['revisions', 'provider']);
        });
    }

    /** @param array<string, mixed> $terms */
    public function revise(OfferThread $thread, User $actor, array $terms): OfferThread
    {
        return DB::transaction(function () use ($thread, $actor, $terms): OfferThread {
            $locked = OfferThread::query()->lockForUpdate()->with(['job', 'provider'])->findOrFail($thread->id);
            abort_unless($locked->status === 'active', 409, 'This negotiation is closed.');
            $job = ServiceJob::query()->findOrFail($locked->service_job_id);
            $provider = ProviderProfile::query()->findOrFail($locked->provider_profile_id);
            abort_unless($actor->id === $job->client_user_id || $actor->id === $provider->user_id, 404);
            $number = $locked->latest_revision_number + 1;
            $latest = $locked->revisions()->where('revision_number', $locked->latest_revision_number)->first();
            if ($latest instanceof OfferRevision && $latest->proposed_by_user_id === $actor->id && $this->sameTerms($latest, $terms)) {
                return $locked->load(['revisions', 'provider']);
            }
            $revision = $this->revision($locked, $actor, $terms, $number);
            $locked->update(['latest_revision_number' => $number]);
            $recipient = $actor->id === $job->client_user_id ? $provider->user_id : $job->client_user_id;
            $this->notify($recipient, 'offer.revised', 'New counteroffer', 'Review the updated price and timing.', $job, $revision);

            return $locked->refresh()->load(['revisions', 'provider']);
        });
    }

    public function close(OfferThread $thread, User $actor, string $outcome): OfferThread
    {
        return DB::transaction(function () use ($thread, $actor, $outcome): OfferThread {
            $locked = OfferThread::query()->lockForUpdate()->with(['job', 'provider'])->findOrFail($thread->id);
            abort_unless($locked->status === 'active', 409);
            $job = ServiceJob::query()->findOrFail($locked->service_job_id);
            $provider = ProviderProfile::query()->findOrFail($locked->provider_profile_id);
            if ($outcome === 'withdrawn') {
                abort_unless($actor->id === $provider->user_id, 404);
            }
            if ($outcome === 'rejected') {
                abort_unless($actor->id === $job->client_user_id, 404);
            }
            $locked->update(['status' => $outcome]);
            $recipient = $actor->id === $job->client_user_id ? $provider->user_id : $job->client_user_id;
            $this->notify($recipient, 'offer.'.$outcome, 'Offer '.($outcome === 'rejected' ? 'declined' : 'withdrawn'), 'The negotiation has closed.', $job, null);

            return $locked->refresh();
        });
    }

    public function select(ServiceJob $job, OfferRevision $revision, User $actor): AcceptedOfferSnapshot
    {
        try {
            return DB::transaction(function () use ($job, $revision, $actor): AcceptedOfferSnapshot {
                $locked = ServiceJob::query()->lockForUpdate()->findOrFail($job->id);
                abort_unless($locked->client_user_id === $actor->id, 404);
                if ($existing = AcceptedOfferSnapshot::query()->where('service_job_id', $locked->id)->first()) {
                    abort_unless($existing->offer_revision_id === $revision->id, 409, 'Another offer was already selected.');

                    return $existing;
                }
                abort_unless($locked->status === 'offers_received', 409);
                $thread = OfferThread::query()->lockForUpdate()->with('provider')->findOrFail($revision->offer_thread_id);
                abort_unless($thread->service_job_id === $locked->id && $thread->status === 'active' && $thread->latest_revision_number === $revision->revision_number, 409, 'Select the current active revision.');
                abort_if($revision->expires_at?->isPast() === true, 409, 'This revision has expired.');
                $snapshot = AcceptedOfferSnapshot::query()->create(['service_job_id' => $locked->id, 'offer_thread_id' => $thread->id, 'offer_revision_id' => $revision->id, 'provider_profile_id' => $thread->provider_profile_id, 'amount_centavos' => $revision->amount_centavos, 'availability_text' => $revision->availability_text, 'estimated_duration_text' => $revision->estimated_duration_text, 'scope' => $revision->scope, 'message' => $revision->message, 'accepted_at' => now()]);
                $thread->update(['status' => 'accepted']);
                OfferThread::query()->where('service_job_id', $locked->id)->whereKeyNot($thread->id)->where('status', 'active')->update(['status' => 'rejected']);
                JobOpportunity::query()->where('service_job_id', $locked->id)->where('provider_profile_id', '!=', $thread->provider_profile_id)->update(['state' => 'dismissed', 'decided_at' => now()]);
                $locked->update(['status' => 'provider_selected', 'version' => $locked->version + 1]);
                $locked->timeline()->create(['id' => (string) Str::uuid(), 'actor_user_id' => $actor->id, 'event_type' => 'offer.selected', 'job_version' => $locked->version, 'metadata' => ['offerRevisionId' => $revision->id, 'providerProfileId' => $thread->provider_profile_id], 'occurred_at' => now()]);
                $provider = ProviderProfile::query()->findOrFail($thread->provider_profile_id);
                $this->notify($provider->user_id, 'offer.selected', 'You were hired', 'The client selected your offer.', $locked, $revision);
                $this->outbox->record('offer.selected', 'service_job', $locked->id, $locked->version, ['rooms' => ["user:{$actor->id}", "user:{$provider->user_id}"], 'jobId' => $locked->id, 'offerRevisionId' => $revision->id]);

                return $snapshot;
            });
        } catch (QueryException $exception) {
            if (AcceptedOfferSnapshot::query()->where('service_job_id', $job->id)->exists()) {
                abort(409, 'Another offer was already selected.');
            }
            throw $exception;
        }
    }

    /** @param array<string, mixed> $terms */
    private function revision(OfferThread $thread, User $actor, array $terms, int $number): OfferRevision
    {
        $revision = $thread->revisions()->create([...$terms, 'id' => (string) Str::uuid(), 'revision_number' => $number, 'proposed_by_user_id' => $actor->id]);
        $job = ServiceJob::query()->whereKey($thread->service_job_id)->firstOrFail();
        $this->outbox->record($number === 1 ? 'offer.created' : 'offer.revised', 'offer_thread', $thread->id, $number, ['rooms' => ["user:{$job->client_user_id}", "user:{$actor->id}"], 'jobId' => $job->id, 'offerThreadId' => $thread->id, 'revisionId' => $revision->id]);

        return $revision;
    }

    private function notify(int $userId, string $type, string $title, string $body, ServiceJob $job, ?OfferRevision $revision): void
    {
        $notification = DurableNotification::query()->create(['user_id' => $userId, 'type' => $type, 'title' => $title, 'body' => $body, 'resource_type' => 'service_job', 'resource_id' => $job->id, 'data' => ['jobId' => $job->id, 'offerRevisionId' => $revision?->id]]);
        foreach (PushDevice::query()->where('user_id', $userId)->whereNull('revoked_at')->get() as $device) {
            $attempt = PushDeliveryAttempt::query()->create(['notification_id' => $notification->id, 'push_device_id' => $device->id, 'attempt' => 1]);
            DB::afterCommit(fn () => DeliverPushNotification::dispatch($attempt->id)->onQueue('notifications'));
        }
        $this->outbox->record('notification.created', 'notification', $notification->id, 1, ['rooms' => ["user:{$userId}"], 'notification' => ['id' => $notification->id, 'type' => $type, 'title' => $title, 'body' => $body, 'jobId' => $job->id]]);
    }

    /** @param array<string, mixed> $terms */
    private function sameTerms(OfferRevision $revision, array $terms): bool
    {
        return $revision->amount_centavos === $terms['amount_centavos']
            && $revision->availability_text === $terms['availability_text']
            && $revision->estimated_duration_text === $terms['estimated_duration_text']
            && $revision->scope === $terms['scope']
            && $revision->message === $terms['message']
            && $revision->expires_at?->toIso8601String() === ($terms['expires_at'] ?? null);
    }
}
