<?php

namespace App\Http\Controllers;

use App\Jobs\ScanDisputeEvidence;
use App\Models\AcceptedOfferSnapshot;
use App\Models\CancellationRequest;
use App\Models\CompletionEvidence;
use App\Models\CompletionSubmission;
use App\Models\DisputeCase;
use App\Models\DisputeEvidence;
use App\Models\JobReview;
use App\Models\ProfileAsset;
use App\Models\RevisionEvidence;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\HiredJobAccess;
use App\Support\JobLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class JobLifecycleController extends Controller
{
    public function __construct(private readonly JobLifecycleService $lifecycle, private readonly HiredJobAccess $access) {}

    public function show(Request $r, ServiceJob $serviceJob): JsonResponse
    {
        $u = $this->user($r);
        $this->access->requireParticipant($serviceJob, $u);

        return response()->json(['data' => $this->present($serviceJob->refresh(), $u)]);
    }

    public function start(Request $r, ServiceJob $serviceJob): JsonResponse
    {
        return response()->json(['data' => $this->present($this->lifecycle->startWork($serviceJob, $this->user($r)), $this->user($r))]);
    }

    public function submit(Request $r, ServiceJob $serviceJob): JsonResponse
    {
        $d = $r->validate(['summary' => 'required|string|min:10|max:2000']);
        $s = $this->lifecycle->submitCompletion($serviceJob, $this->user($r), $d['summary']);

        return response()->json(['data' => ['id' => $s->id, 'cycle' => $s->cycle]], 201);
    }

    public function evidence(Request $r, CompletionSubmission $completionSubmission): JsonResponse
    {
        $u = $this->user($r);
        $job = ServiceJob::query()->findOrFail($completionSubmission->service_job_id);
        $p = $this->access->requireParticipant($job, $u);
        abort_unless($u->id === $p['providerId'], 404);
        abort_unless($completionSubmission->evidence()->count() < 5, 422, 'A completion can have up to 5 evidence files.');
        $d = $r->validate(['file' => 'required|file|max:10240|mimes:jpg,jpeg,png,webp,pdf,mp4,webm,mov']);
        $file = $d['file'];
        $id = (string) Str::uuid();
        $key = "completion/{$job->id}/{$id}";
        $file->storeAs('', $key, 'private');
        $e = CompletionEvidence::query()->create(['id' => $id, 'completion_submission_id' => $completionSubmission->id, 'owner_user_id' => $u->id, 'disk' => 'private', 'object_key' => $key, 'original_name' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType(), 'size_bytes' => $file->getSize(), 'scan_status' => 'pending']);

        return response()->json(['data' => ['id' => $e->id, 'scanStatus' => $e->scan_status]], 201);
    }

    public function confirm(Request $r, ServiceJob $serviceJob): JsonResponse
    {
        $j = $this->lifecycle->confirm($serviceJob, $this->user($r));

        return response()->json(['data' => $this->present($j, $this->user($r))]);
    }

    public function revision(Request $r, ServiceJob $serviceJob): JsonResponse
    {
        $d = $r->validate(['reason' => 'required|string|min:10|max:1000']);
        $j = $this->lifecycle->requestRevision($serviceJob, $this->user($r), $d['reason']);

        return response()->json(['data' => $this->present($j, $this->user($r))]);
    }

    public function revisionEvidence(Request $r, ServiceJob $serviceJob): JsonResponse
    {
        $u = $this->user($r);
        $participants = $this->access->requireParticipant($serviceJob, $u);
        abort_unless($u->id === $participants['clientId'], 404);
        abort_unless($serviceJob->status === 'revision_requested', 409);
        $submission = CompletionSubmission::query()->where('service_job_id', $serviceJob->id)->latest('cycle')->firstOrFail();
        abort_unless(RevisionEvidence::query()->where('completion_submission_id', $submission->id)->count() < 5, 422, 'A revision request can have up to 5 evidence files.');
        $data = $r->validate(['file' => 'required|file|max:10240|mimes:jpg,jpeg,png,webp,pdf,mp4,webm,mov']);
        $file = $data['file'];
        $id = (string) Str::uuid();
        $key = "revisions/{$serviceJob->id}/{$id}";
        $file->storeAs('', $key, 'private');
        $evidence = RevisionEvidence::query()->create([
            'id' => $id, 'service_job_id' => $serviceJob->id,
            'completion_submission_id' => $submission->id, 'owner_user_id' => $u->id,
            'disk' => 'private', 'object_key' => $key,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(), 'size_bytes' => $file->getSize(),
            'scan_status' => 'pending',
        ]);

        return response()->json(['data' => ['id' => $evidence->id, 'scanStatus' => $evidence->scan_status]], 201);
    }

    public function cancel(Request $r, ServiceJob $serviceJob): JsonResponse
    {
        $d = $r->validate(['reason' => 'required|string|min:10|max:1000']);
        $v = $this->lifecycle->cancel($serviceJob, $this->user($r), $d['reason']);

        return response()->json(['data' => $v instanceof CancellationRequest ? ['requestId' => $v->id, 'status' => $v->status] : ['status' => $v->status]], $v instanceof CancellationRequest ? 202 : 200);
    }

    public function dispute(Request $r, ServiceJob $serviceJob): JsonResponse
    {
        $d = $r->validate(['reason' => 'required|string|min:10|max:2000']);
        $c = $this->lifecycle->openDispute($serviceJob, $this->user($r), $d['reason']);

        return response()->json(['data' => ['id' => $c->id, 'status' => $c->status]], 201);
    }

    public function disputeEvidence(Request $r, DisputeCase $disputeCase): JsonResponse
    {
        $u = $this->user($r);
        $job = ServiceJob::query()->findOrFail($disputeCase->service_job_id);
        $this->access->requireParticipant($job, $u);
        abort_unless(in_array($disputeCase->status, ['open', 'assigned', 'appealed'], true), 409);
        abort_unless($disputeCase->evidence()->count() < 5, 422, 'A dispute can have up to 5 evidence files.');
        $d = $r->validate(['note' => 'nullable|string|max:2000', 'file' => 'nullable|file|max:10240|mimes:jpg,jpeg,png,webp,pdf,mp4,webm,mov']);
        abort_unless(filled($d['note'] ?? null) || $r->hasFile('file'), 422);
        $values = ['id' => (string) Str::uuid(), 'dispute_case_id' => $disputeCase->id, 'submitted_by_user_id' => $u->id, 'note' => $d['note'] ?? null];
        if ($r->hasFile('file')) {
            $f = $r->file('file');
            $key = "disputes/{$disputeCase->id}/{$values['id']}";
            $f->storeAs('', $key, 'private');
            $values += ['disk' => 'private', 'object_key' => $key, 'original_name' => $f->getClientOriginalName(), 'mime_type' => $f->getMimeType(), 'size_bytes' => $f->getSize(), 'scan_status' => 'pending'];
        }$e = DisputeEvidence::query()->create($values);
        if ($e->object_key) {
            ScanDisputeEvidence::dispatch($e->id);
        }

        return response()->json(['data' => ['id' => $e->id]], 201);
    }

    public function disputeEvidenceShow(Request $r, DisputeEvidence $disputeEvidence): StreamedResponse
    {
        $u = $this->user($r);
        $case = DisputeCase::query()->findOrFail($disputeEvidence->dispute_case_id);
        $job = ServiceJob::query()->findOrFail($case->service_job_id);
        if (! $u->is_admin) {
            $this->access->requireParticipant($job, $u);
        }
        abort_unless($disputeEvidence->scan_status === 'clean' && $disputeEvidence->object_key, 404);

        return Storage::disk($disputeEvidence->disk)->response($disputeEvidence->object_key, $disputeEvidence->original_name, ['Content-Type' => $disputeEvidence->mime_type]);
    }

    private function user(Request $r): User
    {
        $u = $r->user();
        abort_unless($u instanceof User, 401);

        return $u;
    }

    /** @return array<string,mixed> */
    private function present(ServiceJob $j, User $u): array
    {
        $p = $this->access->participants($j);
        $j->loadMissing(['category:id,name,icon', 'area:id,name,type']);
        $snapshot = AcceptedOfferSnapshot::query()->where('service_job_id', $j->id)->firstOrFail();
        $counterpartId = $u->id === $p['clientId'] ? $p['providerId'] : $p['clientId'];
        $counterpart = User::query()->findOrFail($counterpartId);
        $counterpartAvatar = ProfileAsset::query()->where('user_id', $counterpartId)->where('purpose', 'avatar')->where('scan_status', 'clean')->latest()->first();
        $counterpartReputation = DB::table('reputation_projections')->where('user_id', $counterpartId)->first(['average_rating', 'published_review_count']);
        $sub = CompletionSubmission::query()->where('service_job_id', $j->id)->latest('cycle')->with('evidence:id,completion_submission_id,original_name,mime_type,scan_status')->first();
        $cancellation = CancellationRequest::query()
            ->where('service_job_id', $j->id)
            ->where('status', 'pending')
            ->latest()
            ->first();
        $dispute = DisputeCase::query()
            ->where('service_job_id', $j->id)
            ->latest()
            ->first();
        $revisionEvidence = $sub
            ? RevisionEvidence::query()
                ->where('completion_submission_id', $sub->id)
                ->get(['id', 'original_name', 'mime_type', 'scan_status'])
            : collect();
        $reviewSubmitted = JobReview::query()
            ->where('service_job_id', $j->id)
            ->where('author_user_id', $u->id)
            ->exists();

        return [
            'jobId' => $j->id,
            'status' => $j->status,
            'version' => $j->version,
            'role' => $u->id === $p['clientId'] ? 'client' : 'provider',
            'job' => [
                'title' => $j->title,
                'description' => $j->description,
                'category' => $j->category,
                'area' => $j->area,
                'addressLabel' => $j->address_label,
                'scheduleType' => $j->schedule_type,
                'scheduledAt' => $j->scheduled_at?->toIso8601String(),
                'agreedAmountCentavos' => $snapshot->amount_centavos,
                'agreedScope' => $snapshot->scope,
                'estimatedDurationText' => $snapshot->estimated_duration_text,
                'counterpart' => [
                    'displayName' => $counterpart->name,
                    'avatarUrl' => $counterpartAvatar ? "/api/v1/profile-assets/{$counterpartAvatar->getKey()}" : null,
                    'rating' => $counterpartReputation?->average_rating,
                    'reviewCount' => (int) ($counterpartReputation->published_review_count ?? 0),
                ],
            ],
            'workStartedAt' => $j->work_started_at?->toIso8601String(),
            'autoConfirmAt' => $j->auto_confirm_at?->toIso8601String(),
            'completedAt' => $j->completed_at?->toIso8601String(),
            'reviewClosesAt' => $j->review_closes_at?->toIso8601String(),
            'reviewSubmitted' => $reviewSubmitted,
            'completion' => $sub ? [
                'id' => $sub->id,
                'cycle' => $sub->cycle,
                'summary' => $sub->summary,
                'submittedAt' => $sub->submitted_at->toIso8601String(),
                'evidence' => $sub->evidence,
            ] : null,
            'revisionEvidence' => $revisionEvidence,
            'cancellation' => $cancellation ? [
                'id' => $cancellation->id,
                'requestedByMe' => $cancellation->requested_by_user_id === $u->id,
                'reason' => $cancellation->reason,
            ] : null,
            'dispute' => $dispute ? [
                'id' => $dispute->id,
                'status' => $dispute->status,
                'reason' => $dispute->reason,
                'appealCount' => $dispute->appeal_count,
                'decidedAt' => $dispute->decided_at?->toIso8601String(),
                'canAppeal' => $dispute->status === 'resolved' && $dispute->appeal_count === 0 && $dispute->decided_at?->greaterThan(now()->subDays(7)),
                'decision' => $dispute->actions()->where('action', 'decided')->latest('occurred_at')->first(['target_state', 'reason', 'occurred_at']),
                'evidence' => $dispute->evidence()
                    ->get(['id', 'original_name', 'mime_type', 'scan_status']),
            ] : null,
        ];
    }
}
