<?php

namespace App\Http\Controllers;

use App\Models\CancellationRequest;
use App\Models\CompletionEvidence;
use App\Models\CompletionSubmission;
use App\Models\DisputeCase;
use App\Models\DisputeEvidence;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\HiredJobAccess;
use App\Support\JobLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

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
        $d = $r->validate(['file' => 'required|file|max:10240|mimes:jpg,jpeg,png,webp,pdf']);
        $file = $d['file'];
        $id = (string) Str::uuid();
        $key = "completion/{$job->id}/{$id}";
        $file->storeAs('', $key, 'private');
        $e = CompletionEvidence::query()->create(['id' => $id, 'completion_submission_id' => $completionSubmission->id, 'owner_user_id' => $u->id, 'disk' => 'private', 'object_key' => $key, 'original_name' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType(), 'size_bytes' => $file->getSize()]);

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
        $d = $r->validate(['note' => 'nullable|string|max:2000', 'file' => 'nullable|file|max:10240|mimes:jpg,jpeg,png,webp,pdf']);
        abort_unless(filled($d['note'] ?? null) || $r->hasFile('file'), 422);
        $values = ['id' => (string) Str::uuid(), 'dispute_case_id' => $disputeCase->id, 'submitted_by_user_id' => $u->id, 'note' => $d['note'] ?? null];
        if ($r->hasFile('file')) {
            $f = $r->file('file');
            $key = "disputes/{$disputeCase->id}/{$values['id']}";
            $f->storeAs('', $key, 'private');
            $values += ['disk' => 'private', 'object_key' => $key, 'original_name' => $f->getClientOriginalName(), 'mime_type' => $f->getMimeType(), 'size_bytes' => $f->getSize(), 'scan_status' => 'pending'];
        }$e = DisputeEvidence::query()->create($values);

        return response()->json(['data' => ['id' => $e->id]], 201);
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
        $sub = CompletionSubmission::query()->where('service_job_id', $j->id)->latest('cycle')->with('evidence:id,completion_submission_id,original_name,mime_type,scan_status')->first();

        return ['jobId' => $j->id, 'status' => $j->status, 'version' => $j->version, 'role' => $u->id === $p['clientId'] ? 'client' : 'provider', 'workStartedAt' => $j->work_started_at?->toIso8601String(), 'autoConfirmAt' => $j->auto_confirm_at?->toIso8601String(), 'completedAt' => $j->completed_at?->toIso8601String(), 'reviewClosesAt' => $j->review_closes_at?->toIso8601String(), 'completion' => $sub ? ['id' => $sub->id, 'cycle' => $sub->cycle, 'summary' => $sub->summary, 'submittedAt' => $sub->submitted_at->toIso8601String(), 'evidence' => $sub->evidence] : null];
    }
}
