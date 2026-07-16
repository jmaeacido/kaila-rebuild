<?php

namespace App\Support;

use App\Jobs\DeliverPushNotification;
use App\Models\DurableNotification;
use App\Models\JobOpportunity;
use App\Models\ProviderProfile;
use App\Models\PushDeliveryAttempt;
use App\Models\PushDevice;
use App\Models\ServiceJob;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class JobPostingService
{
    public function __construct(private readonly OutboxRecorder $outbox) {}

    public function post(ServiceJob $job, User $actor): ServiceJob
    {
        return DB::transaction(function () use ($job, $actor): ServiceJob {
            /** @var ServiceJob $locked */
            $locked = ServiceJob::query()->lockForUpdate()->findOrFail($job->id);
            abort_unless($locked->client_user_id === $actor->id, 403);
            if ($locked->status === 'posted') {
                return $locked;
            }
            abort_unless($locked->status === 'draft', 409, 'Only a draft can be posted.');

            $locked->update(['status' => 'posted', 'posted_at' => now(), 'version' => $locked->version + 1]);
            $locked->timeline()->create(['id' => (string) Str::uuid(), 'actor_user_id' => $actor->id, 'event_type' => 'job.posted', 'job_version' => $locked->version, 'metadata' => [], 'occurred_at' => now()]);

            $scheduledAt = $locked->scheduled_at;
            $providers = ProviderProfile::query()->where('status', 'active')->where('user_id', '!=', $actor->id)
                ->whereHas('services', fn ($query) => $query->whereKey($locked->service_category_id)->where('is_active', true))
                ->whereHas('serviceAreas', fn ($query) => $query->whereKey($locked->area_id)->where('is_active', true))
                ->when($scheduledAt, function ($query) use ($scheduledAt): void {
                    if ($scheduledAt === null) {
                        return;
                    }
                    $local = $scheduledAt->timezone(config('app.timezone'));
                    $query->whereHas('availability', fn ($availability) => $availability->where('is_available', true)->where('day_of_week', $local->dayOfWeek)->where('starts_at', '<=', $local->format('H:i:s'))->where('ends_at', '>', $local->format('H:i:s')));
                })->select(['id', 'user_id'])->orderBy('id')->get();

            foreach ($providers as $provider) {
                JobOpportunity::query()->create(['service_job_id' => $locked->id, 'provider_profile_id' => $provider->id]);
                $notification = DurableNotification::query()->create(['user_id' => $provider->user_id, 'type' => 'opportunity.matched', 'title' => 'New job near you', 'body' => $locked->title, 'resource_type' => 'service_job', 'resource_id' => $locked->id, 'data' => ['areaId' => $locked->area_id, 'categoryId' => $locked->service_category_id]]);
                foreach (PushDevice::query()->where('user_id', $provider->user_id)->whereNull('revoked_at')->get() as $device) {
                    $attempt = PushDeliveryAttempt::query()->create(['notification_id' => $notification->id, 'push_device_id' => $device->id, 'attempt' => 1]);
                    DB::afterCommit(fn () => DeliverPushNotification::dispatch($attempt->id)->onQueue('notifications'));
                }
                $this->outbox->record('opportunity.matched', 'notification', $notification->id, 1, ['rooms' => ["user:{$provider->user_id}"], 'notification' => ['id' => $notification->id, 'type' => $notification->type, 'title' => $notification->title, 'body' => $notification->body, 'jobId' => $locked->id]]);
            }

            $this->outbox->record('job.posted', 'service_job', $locked->id, $locked->version, ['rooms' => ["user:{$actor->id}"], 'jobId' => $locked->id, 'status' => 'posted']);

            return $locked->refresh();
        });
    }
}
