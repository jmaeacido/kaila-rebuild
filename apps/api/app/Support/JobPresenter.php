<?php

namespace App\Support;

use App\Models\Area;
use App\Models\ProfileAsset;
use App\Models\ServiceJob;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class JobPresenter
{
    /** @return array<string, mixed> */
    public function owned(ServiceJob $job): array
    {
        $job->loadMissing(['category:id,name,icon', 'area:id,parent_id,name,type', 'assets:id,service_job_id,original_name,mime_type,size_bytes,scan_status', 'timeline']);
        $hasOffers = $job->offers()->exists();

        return [
            'id' => $job->id, 'status' => $job->status, 'title' => $job->title, 'description' => $job->description,
            'category' => $job->category, 'area' => $job->area, 'scheduleType' => $job->schedule_type,
            'scheduledAt' => $job->scheduled_at?->toIso8601String(), 'budgetMinCentavos' => $job->budget_min_centavos,
            'budgetMaxCentavos' => $job->budget_max_centavos, 'addressLabel' => $job->address_label,
            'location' => $job->latitude !== null ? ['latitude' => $job->latitude, 'longitude' => $job->longitude] : null,
            'version' => $job->version, 'postedAt' => $job->posted_at?->toIso8601String(),
            'assets' => $job->assets->map(fn ($asset) => [
                'id' => $asset->id,
                'name' => $asset->original_name,
                'mimeType' => $asset->mime_type,
                'sizeBytes' => $asset->size_bytes,
                'scanStatus' => $asset->scan_status,
                'url' => $asset->scan_status === 'clean' ? "/api/v1/job-assets/{$asset->id}" : null,
            ]),
            'canEdit' => $job->status === 'draft' || ($job->status === 'posted' && ! $hasOffers),
            'canCancel' => in_array($job->status, ['draft', 'posted', 'offers_received', 'provider_selected', 'provider_traveling'], true),
            'timeline' => $job->timeline->map(fn ($event) => ['id' => $event->id, 'type' => $event->event_type, 'jobVersion' => $event->job_version, 'metadata' => $event->metadata, 'occurredAt' => $event->occurred_at->toIso8601String()]),
        ];
    }

    /**
     * Exact address, coordinates, and pending assets are deliberately absent.
     *
     * @return array<string, mixed>
     */
    public function opportunity(ServiceJob $job, int $opportunityId, string $state): array
    {
        $job->loadMissing(['category:id,name,icon', 'area:id,name,type', 'assets' => fn ($query) => $query->where('scan_status', 'clean')->select('id', 'service_job_id', 'original_name', 'mime_type', 'size_bytes', 'scan_status')]);
        $area = $job->area;
        abort_unless($area instanceof Area, 404);
        $client = User::query()->findOrFail($job->client_user_id);
        $avatar = ProfileAsset::query()
            ->where('user_id', $job->client_user_id)
            ->where('purpose', 'avatar')
            ->where('scan_status', 'clean')
            ->latest()
            ->first();
        $reputation = DB::table('reputation_projections')->where('user_id', $job->client_user_id);

        return [
            'id' => $opportunityId, 'jobId' => $job->id, 'state' => $state, 'title' => $job->title, 'description' => $job->description,
            'client' => [
                'displayName' => $client->name,
                'avatarUrl' => $avatar ? "/api/v1/profile-assets/{$avatar->getKey()}" : null,
                'rating' => $reputation->value('average_rating'),
                'reviewCount' => (int) ($reputation->value('published_review_count') ?? 0),
            ],
            'category' => $job->category, 'area' => $job->area, 'scheduleType' => $job->schedule_type,
            'scheduledAt' => $job->scheduled_at?->toIso8601String(), 'budgetMinCentavos' => $job->budget_min_centavos,
            'budgetMaxCentavos' => $job->budget_max_centavos,
            'approximateAddress' => $area->name,
            'approximateLocation' => $job->latitude !== null ? [
                'latitude' => round((float) $job->latitude, 3),
                'longitude' => round((float) $job->longitude, 3),
            ] : null,
            'attachmentCount' => $job->assets->count(),
            'assets' => $job->assets->map(fn ($asset) => [
                'id' => $asset->id,
                'name' => $asset->original_name,
                'mimeType' => $asset->mime_type,
                'sizeBytes' => $asset->size_bytes,
                'url' => "/api/v1/job-assets/{$asset->id}",
            ]),
            'postedAt' => $job->posted_at?->toIso8601String(),
        ];
    }
}
