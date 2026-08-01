<?php

namespace App\Http\Controllers;

use App\Models\DisputeCase;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\HiredJobAccess;
use App\Support\JobLifecycleService;
use App\Support\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminDisputeController extends Controller
{
    public function __construct(private readonly JobLifecycleService $lifecycle, private readonly HiredJobAccess $access, private readonly NotificationService $notifications) {}

    public function index(): JsonResponse
    {
        return response()->json(['data' => DisputeCase::query()->whereIn('status', ['open', 'assigned', 'appealed'])->withCount('evidence')->oldest()->get()]);
    }

    public function show(Request $r, DisputeCase $disputeCase): JsonResponse
    {
        $u = $this->staff($r);
        $d = $r->validate(['accessReason' => 'required|string|min:10|max:500']);
        $disputeCase->newQuery()->whereKey($disputeCase->id)->update(['assigned_to_user_id' => $disputeCase->assigned_to_user_id ?? $u->id, 'status' => $disputeCase->status === 'open' ? 'assigned' : $disputeCase->status]);
        \DB::table('dispute_access_audits')->insert(['id' => (string) Str::uuid(), 'dispute_case_id' => $disputeCase->id, 'staff_user_id' => $u->id, 'reason' => $d['accessReason'], 'accessed_at' => now(), 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['data' => $disputeCase->refresh()->load(['actions', 'evidence'])]);
    }

    public function participantShow(Request $r, DisputeCase $disputeCase): JsonResponse
    {
        $u = $r->user();
        abort_unless($u instanceof User, 401);
        $job = ServiceJob::query()->findOrFail($disputeCase->service_job_id);
        $this->access->requireParticipant($job, $u);

        return response()->json(['data' => $disputeCase->load(['actions' => fn ($q) => $q->oldest('occurred_at'), 'evidence' => fn ($q) => $q->oldest()])]);
    }

    public function assign(Request $r, DisputeCase $disputeCase): JsonResponse
    {
        $u = $this->staff($r);
        $d = $r->validate(['assigneeUserId' => 'nullable|integer|exists:users,id']);
        $assignee = (int) ($d['assigneeUserId'] ?? $u->id);
        abort_unless(User::query()->whereKey($assignee)->where('is_admin', true)->exists(), 422);
        abort_unless(in_array($disputeCase->status, ['open', 'assigned', 'appealed'], true), 409);
        $disputeCase->update(['assigned_to_user_id' => $assignee, 'status' => $disputeCase->status === 'open' ? 'assigned' : $disputeCase->status]);
        $disputeCase->actions()->create(['actor_user_id' => $u->id, 'action' => 'assigned', 'reason' => 'Assigned for support review.', 'metadata' => ['assigneeUserId' => $assignee], 'occurred_at' => now()]);

        return response()->json(['data' => ['status' => $disputeCase->status, 'assignedToUserId' => $assignee]]);
    }

    public function decide(Request $r, DisputeCase $disputeCase): JsonResponse
    {
        $u = $this->staff($r);
        abort_unless(\DB::table('dispute_access_audits')->where('dispute_case_id', $disputeCase->id)->where('staff_user_id', $u->id)->exists(), 403, 'Record an access reason before deciding this case.');
        $d = $r->validate(['targetState' => 'required|in:provider_selected,provider_traveling,working,completion_submitted,revision_requested,completed,cancelled', 'reason' => 'required|string|min:10|max:2000']);
        $j = $this->lifecycle->resolve($disputeCase, $u, $d['targetState'], $d['reason']);
        $case = $disputeCase->refresh();
        $job = ServiceJob::query()->findOrFail($case->service_job_id);
        $participants = $this->access->participants($job);
        foreach (array_unique([$participants['clientId'], $participants['providerId']]) as $participantId) {
            $this->notifications->send($participantId, 'dispute.resolved', 'Support decision recorded', 'KAILA support has recorded a decision for your job dispute.', 'dispute_case', $case->id, ['caseId' => $case->id, 'jobId' => $job->id], 'support');
        }

        return response()->json(['data' => ['caseId' => $disputeCase->id, 'jobStatus' => $j->status]]);
    }

    public function appeal(Request $r, DisputeCase $disputeCase): JsonResponse
    {
        $u = $r->user();
        abort_unless($u instanceof User, 401);
        $d = $r->validate(['reason' => 'required|string|min:10|max:2000']);
        $case = $this->lifecycle->appeal($disputeCase, $u, $d['reason']);

        return response()->json(['data' => ['status' => $case->status]]);
    }

    private function staff(Request $r): User
    {
        $u = $r->user();
        abort_unless($u instanceof User && $u->is_admin, 403);

        return $u;
    }
}
