<?php

namespace App\Support;

use App\Models\AcceptedOfferSnapshot;
use App\Models\CancellationRequest;
use App\Models\CompletionSubmission;
use App\Models\DisputeCase;
use App\Models\JobReview;
use App\Models\ServiceJob;
use App\Models\TravelSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class JobLifecycleService
{
    public function __construct(private readonly HiredJobAccess $access, private readonly OutboxRecorder $outbox) {}

    public function startWork(ServiceJob $job, User $actor): ServiceJob
    {
        return $this->locked($job, function (ServiceJob $locked) use ($actor): void {
            $p = $this->access->requireParticipant($locked, $actor);
            abort_unless($actor->id === $p['providerId'], 404);
            abort_unless(in_array($locked->status, ['provider_selected', 'provider_traveling', 'revision_requested'], true), 409);
            $this->transition($locked, 'working', $actor, 'work.started');
        });
    }

    public function submitCompletion(ServiceJob $job, User $actor, string $summary): CompletionSubmission
    {
        return DB::transaction(function () use ($job, $actor, $summary): CompletionSubmission {
            $locked = ServiceJob::query()->lockForUpdate()->findOrFail($job->id);
            $p = $this->access->requireParticipant($locked, $actor);
            abort_unless($actor->id === $p['providerId'], 404);
            abort_unless($locked->status === 'working', 409);
            $cycle = (int) CompletionSubmission::query()->where('service_job_id', $locked->id)->max('cycle') + 1;
            $deadline = (string) Str::uuid();
            $submission = CompletionSubmission::query()->create(['service_job_id' => $locked->id, 'provider_user_id' => $actor->id, 'cycle' => $cycle, 'summary' => $summary, 'submitted_at' => now(), 'deadline_id' => $deadline]);
            $locked->auto_confirm_at = now()->addHours(config('phase_six.auto_confirm_hours'));
            $locked->completion_deadline_id = $deadline;
            $this->transition($locked, 'completion_submitted', $actor, 'completion.submitted', ['submissionId' => $submission->id, 'cycle' => $cycle]);

            return $submission;
        });
    }

    public function confirm(ServiceJob $job, ?User $actor, ?string $deadlineId = null): ServiceJob
    {
        return $this->locked($job, function (ServiceJob $locked) use ($actor, $deadlineId): void {
            abort_unless($locked->status === 'completion_submitted', 409);
            $p = $this->access->participants($locked);
            if ($actor) {
                abort_unless($actor->id === $p['clientId'], 404);
            } else {
                abort_unless($deadlineId === $locked->completion_deadline_id && $locked->auto_confirm_at?->isPast(), 409);
            }
            $locked->completed_at = now();
            $locked->review_closes_at = now()->addDays(config('phase_six.review_window_days'));
            $locked->auto_confirm_at = null;
            $this->transition($locked, 'completed', $actor, $actor ? 'completion.confirmed' : 'completion.auto_confirmed');
        });
    }

    public function requestRevision(ServiceJob $job, User $actor, string $reason): ServiceJob
    {
        return $this->locked($job, function (ServiceJob $locked) use ($actor, $reason): void {
            $p = $this->access->requireParticipant($locked, $actor);
            abort_unless($actor->id === $p['clientId'], 404);
            abort_unless($locked->status === 'completion_submitted', 409);
            $locked->auto_confirm_at = null;
            $locked->completion_deadline_id = null;
            $this->transition($locked, 'revision_requested', $actor, 'completion.revision_requested', ['reason' => $reason]);
        });
    }

    public function cancel(ServiceJob $job, User $actor, string $reason): CancellationRequest|ServiceJob
    {
        return DB::transaction(function () use ($job, $actor, $reason) {
            $locked = ServiceJob::query()->lockForUpdate()->findOrFail($job->id);
            if (in_array($locked->status, ['posted', 'offers_received'], true)) {
                abort_unless($locked->client_user_id === $actor->id, 404);
                $this->transition($locked, 'cancelled', $actor, 'job.cancelled', ['reason' => $reason]);

                return $locked;
            }
            $p = $this->access->requireParticipant($locked, $actor);
            abort_unless(in_array($locked->status, ['provider_selected', 'provider_traveling'], true), 409, 'Cancellation now requires a dispute.');
            $existing = CancellationRequest::query()->where('service_job_id', $locked->id)->where('status', 'pending')->first();
            if ($existing && $existing->requested_by_user_id !== $actor->id) {
                $existing->update(['status' => 'accepted', 'responded_by_user_id' => $actor->id, 'responded_at' => now()]);
                $this->transition($locked, 'cancelled', $actor, 'job.cancelled', ['reason' => $reason, 'requestId' => $existing->id]);

                return $locked;
            }

            return $existing ?: CancellationRequest::query()->create(['service_job_id' => $locked->id, 'requested_by_user_id' => $actor->id, 'reason' => $reason]);
        });
    }

    public function openDispute(ServiceJob $job, User $actor, string $reason): DisputeCase
    {
        return DB::transaction(function () use ($job, $actor, $reason) {
            $locked = ServiceJob::query()->lockForUpdate()->findOrFail($job->id);
            $this->access->requireParticipant($locked, $actor);
            abort_unless(in_array($locked->status, ['provider_selected', 'provider_traveling', 'working', 'completion_submitted', 'revision_requested'], true), 409);
            abort_if(DisputeCase::query()->where('service_job_id', $locked->id)->whereIn('status', ['open', 'assigned', 'appealed'])->exists(), 409);
            $case = DisputeCase::query()->create(['service_job_id' => $locked->id, 'opened_by_user_id' => $actor->id, 'resume_state' => $locked->status, 'reason' => $reason]);
            if ($locked->status === 'completion_submitted' && $locked->auto_confirm_at) {
                $remaining = max(0, now()->diffInSeconds($locked->auto_confirm_at, false));
                $locked->auto_confirm_at = null;
            } else {
                $remaining = null;
            }
            $case->actions()->create(['actor_user_id' => $actor->id, 'action' => 'opened', 'reason' => $reason, 'metadata' => ['remainingAutoConfirmSeconds' => $remaining], 'occurred_at' => now()]);
            $this->transition($locked, 'disputed', $actor, 'dispute.opened', ['caseId' => $case->id]);

            return $case;
        });
    }

    public function resolve(DisputeCase $case, User $staff, string $target, string $reason): ServiceJob
    {
        return DB::transaction(function () use ($case, $staff, $target, $reason) {
            abort_unless($staff->is_admin, 403);
            $lockedCase = DisputeCase::query()->lockForUpdate()->findOrFail($case->id);
            abort_unless(in_array($lockedCase->status, ['open', 'assigned', 'appealed'], true), 409);
            if ($lockedCase->status === 'appealed') {
                abort_if($lockedCase->assigned_to_user_id === $staff->id, 409, 'A different reviewer must decide the appeal.');
            }
            abort_if($target !== $lockedCase->resume_state && ! in_array($target, ['revision_requested', 'completed', 'cancelled'], true), 422);
            $job = ServiceJob::query()->lockForUpdate()->findOrFail($lockedCase->service_job_id);
            abort_unless($job->status === 'disputed', 409);
            $lockedCase->update(['status' => 'resolved', 'assigned_to_user_id' => $staff->id, 'decided_at' => now()]);
            $lockedCase->actions()->create(['actor_user_id' => $staff->id, 'action' => 'decided', 'target_state' => $target, 'reason' => $reason, 'metadata' => [], 'occurred_at' => now()]);
            if ($target === 'completed') {
                $job->completed_at = now();
                $job->review_closes_at = now()->addDays(config('phase_six.review_window_days'));
            } elseif ($target === 'completion_submitted') {
                $remaining = (int) ($lockedCase->actions()->where('action', 'opened')->value('metadata->remainingAutoConfirmSeconds') ?? 0);
                $job->auto_confirm_at = now()->addSeconds($remaining);
            }
            $this->transition($job, $target, $staff, 'dispute.resolved', ['caseId' => $lockedCase->id, 'reason' => $reason]);

            return $job;
        });
    }

    public function appeal(DisputeCase $case, User $actor, string $reason): DisputeCase
    {
        return DB::transaction(function () use ($case, $actor, $reason) {
            $locked = DisputeCase::query()->lockForUpdate()->findOrFail($case->id);
            $job = ServiceJob::query()->lockForUpdate()->findOrFail($locked->service_job_id);
            $this->access->requireParticipant($job, $actor);
            abort_unless($locked->status === 'resolved' && $locked->appeal_count === 0 && $locked->decided_at?->greaterThan(now()->subDays(7)), 409);
            $locked->update(['status' => 'appealed', 'appeal_count' => 1, 'resume_state' => $job->status]);
            $locked->actions()->create(['actor_user_id' => $actor->id, 'action' => 'appealed', 'reason' => $reason, 'metadata' => [], 'occurred_at' => now()]);
            $this->transition($job, 'disputed', $actor, 'dispute.appealed', ['caseId' => $locked->id]);

            return $locked;
        });
    }

    public function submitReview(ServiceJob $job, User $actor, int $rating, ?string $comment): JobReview
    {
        return DB::transaction(function () use ($job, $actor, $rating, $comment) {
            $locked = ServiceJob::query()->lockForUpdate()->findOrFail($job->id);
            abort_unless($locked->status === 'completed' && $locked->review_closes_at?->isFuture(), 409);
            $p = $this->access->requireParticipant($locked, $actor);
            $subject = $actor->id === $p['clientId'] ? $p['providerId'] : $p['clientId'];
            $review = JobReview::query()->firstOrCreate(['service_job_id' => $locked->id, 'author_user_id' => $actor->id], ['subject_user_id' => $subject, 'rating' => $rating, 'comment' => $comment]);
            abort_unless($review->wasRecentlyCreated, 409, 'Your review is already final.');
            if (JobReview::query()->where('service_job_id', $locked->id)->count() === 2) {
                $this->closeReviews($locked, 'reviews.completed');
            }

return $review;
        });
    }

    public function closeReviewWindow(ServiceJob $job): ServiceJob
    {
        return $this->locked($job, function (ServiceJob $locked): void {
            abort_unless($locked->status === 'completed' && $locked->review_closes_at?->isPast(), 409);
            $this->closeReviews($locked, 'reviews.window_closed');
        });
    }

    private function closeReviews(ServiceJob $job, string $event): void
    {
        JobReview::query()->where('service_job_id', $job->id)->whereNull('published_at')->update(['published_at' => now()]);
        foreach (JobReview::query()->where('service_job_id', $job->id)->get()->groupBy('subject_user_id') as $uid => $reviews) {
            $all = JobReview::query()->where('subject_user_id', $uid)->whereNotNull('published_at')->whereNull('moderated_at');
            $count = $all->count();
            $sum = (int) $all->sum('rating');
            DB::table('reputation_projections')->updateOrInsert(['user_id' => $uid], ['published_review_count' => $count, 'rating_sum' => $sum, 'average_rating' => $count ? round($sum / $count, 2) : null, 'created_at' => now(), 'updated_at' => now()]);
        }
        $this->transition($job, 'rated_closed', null, $event);
    }

    private function locked(ServiceJob $job, callable $action): ServiceJob
    {
        return DB::transaction(function () use ($job, $action) {
            $locked = ServiceJob::query()->lockForUpdate()->findOrFail($job->id);
            $action($locked);

            return $locked->refresh();
        });
    }

    /** @param array<string,mixed> $metadata */
    private function transition(ServiceJob $job, string $to, ?User $actor, string $event, array $metadata = []): void
    {
        $from = $job->status;
        if (in_array($to, ['working', 'completion_submitted', 'completed', 'rated_closed', 'cancelled', 'disputed', 'revision_requested'], true)) {
            $this->stopTravel($job);
        }
        $job->status = $to;
        $job->version++;
        $job->save();
        $job->timeline()->create(['id' => (string) Str::uuid(), 'actor_user_id' => $actor?->id, 'event_type' => $event, 'job_version' => $job->version, 'metadata' => ['from' => $from, 'to' => $to, ...$metadata], 'occurred_at' => now()]);
        $snapshot = AcceptedOfferSnapshot::query()->where('service_job_id', $job->id)->exists();
        $rooms = ["user:{$job->client_user_id}"];
        if ($snapshot) {
            $p = $this->access->participants($job);
            $rooms[] = "user:{$p['providerId']}";
        }$this->outbox->record('job.state.changed','service_job',$job->id,$job->version,['rooms' => $rooms, 'jobId' => $job->id, 'status' => $to, 'version' => $job->version]);
    }

    private function stopTravel(ServiceJob $job): void
    {
        TravelSession::query()->where('service_job_id',$job->id)->where('status','active')->update(['status' => 'stopped', 'stopped_at' => now()]);
    }
}
