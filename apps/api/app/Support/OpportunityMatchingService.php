<?php

namespace App\Support;

use App\Jobs\DeliverPushNotification;
use App\Models\Area;
use App\Models\DurableNotification;
use App\Models\JobOpportunity;
use App\Models\ProviderProfile;
use App\Models\PushDeliveryAttempt;
use App\Models\PushDevice;
use App\Models\ServiceJob;
use Illuminate\Support\Facades\DB;

class OpportunityMatchingService
{
    public function __construct(private readonly OutboxRecorder $outbox) {}

    public function matchJob(ServiceJob $job, int $excludedUserId): void
    {
        $jobArea = Area::query()->whereKey($job->area_id)->firstOrFail();
        $matchingAreaIds = array_values(array_filter([$jobArea->id, $jobArea->parent_id]));
        $scheduledAt = $job->scheduled_at;
        $providers = ProviderProfile::query()->where('status', 'active')->where('user_id', '!=', $excludedUserId)
            ->whereHas('services', fn ($query) => $query->whereKey($job->service_category_id)->where('is_active', true))
            ->whereHas('serviceAreas', fn ($query) => $query->whereKey($matchingAreaIds)->where('is_active', true))
            ->when($scheduledAt, function ($query) use ($scheduledAt): void {
                if ($scheduledAt === null) {
                    return;
                }
                $local = $scheduledAt->timezone(config('app.timezone'));
                $query->whereHas('availability', fn ($availability) => $availability->where('is_available', true)->where('day_of_week', $local->dayOfWeek)->where('starts_at', '<=', $local->format('H:i:s'))->where('ends_at', '>', $local->format('H:i:s')));
            })->select(['id', 'user_id'])->orderBy('id')->get();

        foreach ($providers as $provider) {
            $this->createOpportunity($job, $provider);
        }
    }

    public function reconcileProvider(ProviderProfile $provider): void
    {
        DB::transaction(fn () => $this->reconcileProviderInsideTransaction($provider));
    }

    private function reconcileProviderInsideTransaction(ProviderProfile $provider): void
    {
        if ($provider->status !== 'active') {
            return;
        }
        $serviceIds = $provider->services()->where('is_active', true)->pluck('service_categories.id');
        $areas = $provider->serviceAreas()->where('is_active', true)->get(['areas.id', 'areas.type']);
        $directAreaIds = $areas->pluck('id');
        $cityIds = $areas->whereIn('type', ['city', 'municipality'])->pluck('id');

        $jobs = ServiceJob::query()
            ->whereIn('status', ['posted', 'offers_received'])
            ->where('client_user_id', '!=', $provider->user_id)
            ->whereIn('service_category_id', $serviceIds)
            ->where(function ($query) use ($directAreaIds, $cityIds): void {
                $query->whereIn('area_id', $directAreaIds)
                    ->orWhereHas('area', fn ($area) => $area->whereIn('parent_id', $cityIds));
            })
            ->orderBy('created_at')
            ->get();

        foreach ($jobs as $job) {
            if ($job->scheduled_at !== null) {
                $local = $job->scheduled_at->timezone(config('app.timezone'));
                $available = $provider->availability()
                    ->where('is_available', true)
                    ->where('day_of_week', $local->dayOfWeek)
                    ->where('starts_at', '<=', $local->format('H:i:s'))
                    ->where('ends_at', '>', $local->format('H:i:s'))
                    ->exists();
                if (! $available) {
                    continue;
                }
            }
            $this->createOpportunity($job, $provider);
        }
    }

    private function createOpportunity(ServiceJob $job, ProviderProfile $provider): void
    {
        $opportunity = JobOpportunity::query()->firstOrCreate([
            'service_job_id' => $job->id,
            'provider_profile_id' => $provider->id,
        ]);
        if (! $opportunity->wasRecentlyCreated) {
            return;
        }

        $notification = DurableNotification::query()->create(['user_id' => $provider->user_id, 'type' => 'opportunity.matched', 'title' => 'New job near you', 'body' => $job->title, 'resource_type' => 'service_job', 'resource_id' => $job->id, 'data' => ['areaId' => $job->area_id, 'categoryId' => $job->service_category_id]]);
        foreach (PushDevice::query()->where('user_id', $provider->user_id)->whereNull('revoked_at')->get() as $device) {
            $attempt = PushDeliveryAttempt::query()->create(['notification_id' => $notification->id, 'push_device_id' => $device->id, 'attempt' => 1]);
            DB::afterCommit(fn () => DeliverPushNotification::dispatch($attempt->id)->onQueue('notifications'));
        }
        $this->outbox->record('opportunity.matched', 'notification', $notification->id, 1, ['rooms' => ["user:{$provider->user_id}"], 'notification' => ['id' => $notification->id, 'type' => $notification->type, 'title' => $notification->title, 'body' => $notification->body, 'jobId' => $job->id]]);
    }
}
