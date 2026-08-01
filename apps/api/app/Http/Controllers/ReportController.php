<?php

namespace App\Http\Controllers;

use App\Models\CommunityPost;
use App\Models\ConversationMessage;
use App\Models\JobReview;
use App\Models\ModerationReport;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\HiredJobAccess;
use App\Support\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private readonly HiredJobAccess $access, private readonly NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $reports = ModerationReport::query()
            ->where('reporter_user_id', $user->id)
            ->with(['actions' => fn ($query) => $query->whereIn('action', ['submitted', 'decided'])->oldest('occurred_at')])
            ->latest()->get()->map(fn (ModerationReport $report) => $this->present($report));

        return response()->json(['data' => $reports]);
    }

    public function show(Request $request, ModerationReport $moderationReport): JsonResponse
    {
        abort_unless($moderationReport->reporter_user_id === $this->user($request)->id, 404);

        return response()->json(['data' => $this->present($moderationReport->load('actions'))]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $data = $request->validate([
            'targetType' => 'required|in:user,job,message,review,community_post',
            'targetId' => 'required|string|max:64',
            'category' => 'required|in:harassment,scam,unsafe,spam,inappropriate,privacy,other',
            'details' => 'required|string|min:10|max:2000',
        ]);
        $this->authorizeTarget($data['targetType'], $data['targetId'], $user);
        abort_if(ModerationReport::query()->where('reporter_user_id', $user->id)->where('target_type', $data['targetType'])->where('target_id', $data['targetId'])->whereIn('status', ['open', 'assigned'])->exists(), 409, 'You already have an active report for this item.');

        $report = ModerationReport::query()->create([
            'reporter_user_id' => $user->id,
            'target_type' => $data['targetType'],
            'target_id' => $data['targetId'],
            'category' => $data['category'],
            'details' => $data['details'],
        ]);
        $report->actions()->create(['actor_user_id' => $user->id, 'action' => 'submitted', 'reason' => $data['details'], 'metadata' => [], 'occurred_at' => now()]);
        foreach (User::query()->where('is_admin', true)->pluck('id') as $staffId) {
            $this->notifications->send($staffId, 'report.opened', 'New safety report', 'A new safety report is ready for review.', 'moderation_report', $report->id, ['reportId' => $report->id], 'support');
        }

        return response()->json(['data' => $this->present($report->refresh()->load('actions'))], 201);
    }

    private function authorizeTarget(string $type, string $id, User $actor): void
    {
        if ($type === 'user') {
            $target = User::query()->findOrFail((int) $id);
            abort_if($target->id === $actor->id || $target->is_admin, 422);

            return;
        }
        if ($type === 'job') {
            $this->access->requireParticipant(ServiceJob::query()->findOrFail($id), $actor);

            return;
        }
        if ($type === 'review') {
            $review = JobReview::query()->findOrFail($id);
            $this->access->requireParticipant(ServiceJob::query()->findOrFail($review->service_job_id), $actor);

            return;
        }
        if ($type === 'message') {
            $message = ConversationMessage::query()->findOrFail($id);
            $jobId = (string) \DB::table('job_conversations')->where('id', $message->conversation_id)->value('service_job_id');
            $this->access->requireParticipant(ServiceJob::query()->findOrFail($jobId), $actor);

            return;
        }
        CommunityPost::query()->where('moderation_status', 'published')->findOrFail($id);
    }

    /** @return array<string, mixed> */
    private function present(ModerationReport $report): array
    {
        $decision = $report->actions->where('action', 'decided')->last();

        return [
            'id' => $report->id, 'targetType' => $report->target_type, 'targetId' => $report->target_id,
            'category' => $report->category, 'details' => $report->details, 'status' => $report->status,
            'createdAt' => $report->created_at?->toIso8601String(), 'decidedAt' => $report->decided_at?->toIso8601String(),
            'outcome' => $decision?->metadata['outcome'] ?? null, 'decisionReason' => $decision?->reason,
        ];
    }

    private function user(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
