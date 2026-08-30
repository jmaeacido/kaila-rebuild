<?php

namespace App\Support;

use App\Models\Area;
use App\Models\JobOpportunity;
use App\Models\ProviderProfile;
use App\Models\ServiceJob;
use Illuminate\Support\Facades\DB;

class OpportunityMatchingService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly OutboxRecorder $outbox,
    ) {}

    public function matchJob(ServiceJob $job, int $excludedUserId): void
    {
        if ($job->direct_provider_profile_id !== null) {
            $provider = ProviderProfile::query()
                ->whereKey($job->direct_provider_profile_id)
                ->where('status', 'active')
                ->where('user_id', '!=', $excludedUserId)
                ->first();

            if ($provider) {
                $this->createOpportunity($job, $provider);
            }

            return;
        }

        $jobArea = Area::query()->whereKey($job->area_id)->firstOrFail();
        $matchingAreaIds = array_values(array_filter([$jobArea->id, $jobArea->parent_id]));
        $scheduledAt = $job->scheduled_at;
        $providers = ProviderProfile::query()->where('status', 'active')->where('user_id', '!=', $excludedUserId)
            ->when($job->service_location_mode === 'at_provider', fn ($query) => $query->where('offers_at_shop', true)->whereNotNull('shop_latitude')->whereNotNull('shop_longitude'))
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
            if (DB::transactionLevel() < 1) {
                DB::transaction(fn () => $this->createOpportunity($job, $provider));
            } else {
                $this->createOpportunity($job, $provider);
            }
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
            ->where(fn ($query) => $query
                ->whereNull('direct_provider_profile_id')
                ->orWhere('direct_provider_profile_id', $provider->id))
            ->whereIn('service_category_id', $serviceIds)
            ->where(function ($query) use ($directAreaIds, $cityIds): void {
                $query->whereIn('area_id', $directAreaIds)
                    ->orWhereHas('area', fn ($area) => $area->whereIn('parent_id', $cityIds));
            })
            ->orderBy('created_at')
            ->get();

        JobOpportunity::query()
            ->where('provider_profile_id', $provider->id)
            ->whereNotIn('service_job_id', $jobs->pluck('id'))
            ->whereHas('job', fn ($job) => $job->whereIn('status', ['posted', 'offers_received']))
            ->whereNotExists(function ($query) use ($provider): void {
                $query->selectRaw('1')
                    ->from('offer_threads')
                    ->whereColumn('offer_threads.service_job_id', 'job_opportunities.service_job_id')
                    ->where('offer_threads.provider_profile_id', $provider->id);
            })
            ->delete();

        foreach ($jobs as $job) {
            if ($job->service_location_mode === 'at_provider' && ! $provider->offers_at_shop) {
                continue;
            }
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

        $this->notifications->send($provider->user_id, 'opportunity.matched', 'New job near you', $job->title, 'service_job', $job->id, [
            'jobId' => $job->id,
            'opportunityId' => $opportunity->id,
            'areaId' => $job->area_id,
            'categoryId' => $job->service_category_id,
        ]);
        $this->outbox->record('opportunity.matched', 'job_opportunity', (string) $opportunity->id, 1, [
            'rooms' => ["user:{$provider->user_id}"],
            'jobId' => $job->id,
            'opportunityId' => $opportunity->id,
            'areaId' => $job->area_id,
            'categoryId' => $job->service_category_id,
        ]);
    }
}
