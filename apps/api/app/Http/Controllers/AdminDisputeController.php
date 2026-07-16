<?php

namespace App\Http\Controllers;

use App\Models\DisputeCase;
use App\Models\User;
use App\Support\JobLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminDisputeController extends Controller
{
    public function __construct(private readonly JobLifecycleService $lifecycle) {}

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

    public function decide(Request $r, DisputeCase $disputeCase): JsonResponse
    {
        $u = $this->staff($r);
        $d = $r->validate(['targetState' => 'required|in:provider_selected,provider_traveling,working,completion_submitted,revision_requested,completed,cancelled', 'reason' => 'required|string|min:10|max:2000']);
        $j = $this->lifecycle->resolve($disputeCase, $u, $d['targetState'], $d['reason']);

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
