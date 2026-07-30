<?php

namespace App\Support;

use App\Models\AcceptedOfferSnapshot;
use App\Models\JobOpportunity;
use App\Models\ProviderProfile;
use App\Models\ServiceJob;

class JobRealtimePublisher
{
    public function __construct(private readonly OutboxRecorder $outbox) {}

    /** @param array<string, mixed> $data */
    public function record(
        string $eventType,
        ServiceJob $job,
        string $resourceType,
        string $resourceId,
        int $resourceVersion,
        array $data = [],
    ): void {
        $providerProfileIds = JobOpportunity::query()
            ->where('service_job_id', $job->id)
            ->pluck('provider_profile_id')
            ->merge(
                AcceptedOfferSnapshot::query()
                    ->where('service_job_id', $job->id)
                    ->pluck('provider_profile_id'),
            )
            ->unique();
        $recipientUserIds = ProviderProfile::query()
            ->whereIn('id', $providerProfileIds)
            ->pluck('user_id')
            ->push($job->client_user_id)
            ->map(static fn (mixed $id): string => (string) $id)
            ->unique()
            ->values()
            ->all();

        foreach (array_chunk($recipientUserIds, 100) as $recipientChunk) {
            $this->outbox->record(
                $eventType,
                $resourceType,
                $resourceId,
                $resourceVersion,
                [
                    'recipientUserIds' => $recipientChunk,
                    'data' => ['jobId' => $job->id] + $data,
                ],
            );
        }
    }
}
