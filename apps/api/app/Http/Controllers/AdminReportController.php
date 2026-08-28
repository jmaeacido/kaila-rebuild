<?php

namespace App\Http\Controllers;

use App\Models\CommunityPost;
use App\Models\ConversationMessage;
use App\Models\JobReview;
use App\Models\ModerationReport;
use App\Models\ModerationReportEvidence;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminReportController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $this->staff($request);
        $status = $request->string('status')->toString();
        $query = ModerationReport::query()->withCount('actions')->oldest();
        if ($status !== '') {
            $query->where('status', $status);
        } else {
            $query->whereIn('status', ['open', 'assigned']);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function show(Request $request, ModerationReport $moderationReport): JsonResponse
    {
        $staff = $this->staff($request);
        $data = $request->validate(['accessReason' => 'required|string|min:10|max:500']);
        DB::transaction(function () use ($moderationReport, $staff, $data): void {
            $moderationReport->newQuery()->whereKey($moderationReport->id)->whereNull('assigned_to_user_id')->update(['assigned_to_user_id' => $staff->id, 'status' => 'assigned']);
            DB::table('moderation_report_access_audits')->insert(['id' => (string) Str::uuid(), 'moderation_report_id' => $moderationReport->id, 'staff_user_id' => $staff->id, 'reason' => $data['accessReason'], 'accessed_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        });

        return response()->json(['data' => $this->present($moderationReport->refresh()->load(['actions', 'evidence']))]);
    }

    public function evidence(Request $request, ModerationReportEvidence $moderationReportEvidence): StreamedResponse
    {
        $staff = $this->staff($request);
        abort_unless(DB::table('moderation_report_access_audits')->where('moderation_report_id', $moderationReportEvidence->moderation_report_id)->where('staff_user_id', $staff->id)->exists(), 403, 'Record an access reason before viewing evidence.');
        abort_unless($moderationReportEvidence->scan_status === 'clean', 404);

        return Storage::disk($moderationReportEvidence->disk)->response(
            $moderationReportEvidence->object_key,
            $moderationReportEvidence->original_name,
            ['Content-Type' => $moderationReportEvidence->mime_type],
        );
    }

    public function assign(Request $request, ModerationReport $moderationReport): JsonResponse
    {
        $staff = $this->staff($request);
        $data = $request->validate(['assigneeUserId' => 'nullable|integer|exists:users,id']);
        $assigneeId = $data['assigneeUserId'] ?? $staff->id;
        abort_unless(User::query()->whereKey($assigneeId)->where('is_admin', true)->exists(), 422);
        abort_unless(in_array($moderationReport->status, ['open', 'assigned'], true), 409);
        $moderationReport->update(['assigned_to_user_id' => $assigneeId, 'status' => 'assigned']);
        $moderationReport->actions()->create(['actor_user_id' => $staff->id, 'action' => 'assigned', 'reason' => 'Assigned for moderation review.', 'metadata' => ['assigneeUserId' => $assigneeId], 'occurred_at' => now()]);

        return response()->json(['data' => ['status' => $moderationReport->status, 'assignedToUserId' => $assigneeId]]);
    }

    public function decide(Request $request, ModerationReport $moderationReport): JsonResponse
    {
        $staff = $this->staff($request);
        abort_unless(DB::table('moderation_report_access_audits')->where('moderation_report_id', $moderationReport->id)->where('staff_user_id', $staff->id)->exists(), 403, 'Record an access reason before deciding this report.');
        $data = $request->validate(['outcome' => 'required|in:no_action,warning,content_removed,account_restricted', 'reason' => 'required|string|min:10|max:2000']);
        abort_unless(in_array($moderationReport->status, ['open', 'assigned'], true), 409);
        DB::transaction(function () use ($moderationReport, $staff, $data): void {
            $this->applyOutcome($moderationReport, $data['outcome']);
            $moderationReport->update(['status' => 'resolved', 'assigned_to_user_id' => $staff->id, 'decided_at' => now()]);
            $moderationReport->actions()->create(['actor_user_id' => $staff->id, 'action' => 'decided', 'reason' => $data['reason'], 'metadata' => ['outcome' => $data['outcome']], 'occurred_at' => now()]);
            $this->notifications->send($moderationReport->reporter_user_id, 'report.resolved', 'Report reviewed', 'KAILA safety has reviewed your report.', 'moderation_report', $moderationReport->id, ['reportId' => $moderationReport->id], 'support');
            if ($data['outcome'] !== 'no_action' && ($subjectId = $this->targetUserId($moderationReport)) !== null) {
                $this->notifications->send($subjectId, 'safety.action_recorded', 'Safety action recorded', 'KAILA safety recorded an action affecting your account or content.', 'moderation_report', $moderationReport->id, ['reportId' => $moderationReport->id], 'security');
            }
        });

        return response()->json(['data' => ['status' => 'resolved', 'outcome' => $data['outcome']]]);
    }

    private function applyOutcome(ModerationReport $report, string $outcome): void
    {
        if ($outcome === 'content_removed') {
            if ($report->target_type === 'review') {
                JobReview::query()->whereKey($report->target_id)->update(['moderated_at' => now(), 'moderation_reason' => 'Removed following safety review.']);
            } elseif ($report->target_type === 'community_post') {
                CommunityPost::query()->whereKey($report->target_id)->update(['moderation_status' => 'removed']);
            } elseif ($report->target_type === 'message') {
                ConversationMessage::query()->whereKey($report->target_id)->update(['body_ciphertext' => null]);
            } else {
                abort(422, 'This target cannot be removed as content.');
            }
        }
        if ($outcome === 'account_restricted') {
            $userId = $this->targetUserId($report);
            abort_unless($userId !== null, 422);
            abort_if(User::query()->findOrFail($userId)->is_admin, 422);
            User::query()->whereKey($userId)->update(['account_status' => 'restricted', 'status_updated_at' => now()]);
            DB::table((string) config('session.table'))->where('user_id', $userId)->delete();
            DB::table('mobile_sessions')->where('user_id', $userId)->whereNull('revoked_at')->update(['revoked_at' => now(), 'updated_at' => now()]);
        }
    }

    private function targetUserId(ModerationReport $report): ?int
    {
        return match ($report->target_type) {
            'user' => (int) $report->target_id,
            'review' => JobReview::query()->findOrFail($report->target_id)->author_user_id,
            'message' => ConversationMessage::query()->findOrFail($report->target_id)->sender_user_id,
            'community_post' => CommunityPost::query()->findOrFail($report->target_id)->author_user_id,
            'job' => ServiceJob::query()->findOrFail($report->target_id)->client_user_id,
            default => null,
        };
    }

    /** @return array<string, mixed> */
    private function present(ModerationReport $report): array
    {
        $data = [...$report->toArray(), 'targetSummary' => $this->targetSummary($report)];
        if ($report->relationLoaded('evidence')) {
            $data['evidence'] = $report->evidence->map(fn ($item) => [
                ...$item->only(['id', 'original_name', 'mime_type', 'size_bytes', 'scan_status']),
                'url' => $item->scan_status === 'clean' ? "/api/v1/admin/marketplace/report-evidence/{$item->id}" : null,
            ])->values();
        }

        return $data;
    }

    /** @return array<string, mixed> */
    private function targetSummary(ModerationReport $report): array
    {
        return match ($report->target_type) {
            'user' => User::query()->findOrFail((int) $report->target_id)->only(['id', 'name', 'email', 'account_status']),
            'job' => ServiceJob::query()->findOrFail($report->target_id)->only(['id', 'title', 'status']),
            'review' => JobReview::query()->findOrFail($report->target_id)->only(['id', 'rating', 'comment', 'author_user_id']),
            'message' => ConversationMessage::query()->findOrFail($report->target_id)->only(['id', 'sender_user_id', 'created_at']),
            'community_post' => CommunityPost::query()->findOrFail($report->target_id)->only(['id', 'title', 'body', 'moderation_status']),
            default => [],
        };
    }

    private function staff(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->is_admin, 403);

        return $user;
    }
}
