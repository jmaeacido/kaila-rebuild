<?php

namespace App\Support;

use App\Models\ServiceJob;

class JobPresenter
{
    /** @return array<string, mixed> */
    public function owned(ServiceJob $job): array
    {
        $job->loadMissing(['category:id,name,icon', 'area:id,name,type', 'assets:id,service_job_id,original_name,mime_type,scan_status', 'timeline']);

        return [
            'id' => $job->id, 'status' => $job->status, 'title' => $job->title, 'description' => $job->description,
            'category' => $job->category, 'area' => $job->area, 'scheduleType' => $job->schedule_type,
            'scheduledAt' => $job->scheduled_at?->toIso8601String(), 'budgetMinCentavos' => $job->budget_min_centavos,
            'budgetMaxCentavos' => $job->budget_max_centavos, 'addressLabel' => $job->address_label,
            'location' => $job->latitude !== null ? ['latitude' => $job->latitude, 'longitude' => $job->longitude] : null,
            'version' => $job->version, 'postedAt' => $job->posted_at?->toIso8601String(), 'assets' => $job->assets,
            'timeline' => $job->timeline->map(fn ($event) => ['id' => $event->id, 'type' => $event->event_type, 'jobVersion' => $event->job_version, 'metadata' => $event->metadata, 'occurredAt' => $event->occurred_at->toIso8601String()]),
        ];
    }

    /**
     * Exact address, coordinates, client identity, and pending assets are deliberately absent.
     *
     * @return array<string, mixed>
     */
    public function opportunity(ServiceJob $job, int $opportunityId, string $state): array
    {
        $job->loadMissing(['category:id,name,icon', 'area:id,name,type', 'assets' => fn ($query) => $query->where('scan_status', 'clean')->select('id', 'service_job_id', 'mime_type')]);

        return [
            'id' => $opportunityId, 'jobId' => $job->id, 'state' => $state, 'title' => $job->title, 'description' => $job->description,
            'category' => $job->category, 'area' => $job->area, 'scheduleType' => $job->schedule_type,
            'scheduledAt' => $job->scheduled_at?->toIso8601String(), 'budgetMinCentavos' => $job->budget_min_centavos,
            'budgetMaxCentavos' => $job->budget_max_centavos, 'attachmentCount' => $job->assets->count(), 'postedAt' => $job->posted_at?->toIso8601String(),
        ];
    }
}
