<?php

namespace App\Support;

use App\Models\ServiceJob;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class JobPostingService
{
    public function __construct(private readonly OutboxRecorder $outbox, private readonly OpportunityMatchingService $matching) {}

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

            $this->matching->matchJob($locked, $actor->id);

            $this->outbox->record('job.posted', 'service_job', $locked->id, $locked->version, ['rooms' => ["user:{$actor->id}"], 'jobId' => $locked->id, 'status' => 'posted']);

            return $locked->refresh();
        });
    }
}
