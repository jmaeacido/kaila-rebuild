<?php

namespace App\Http\Controllers;

use App\Models\SupportCase;
use App\Models\SupportMessage;
use App\Models\User;
use App\Support\NotificationService;
use App\Support\OutboxRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminSupportCaseController extends Controller
{
    public function __construct(private readonly OutboxRecorder $outbox, private readonly NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['status' => 'nullable|in:open,waiting_for_support,waiting_for_customer,resolved,closed', 'priority' => 'nullable|in:low,normal,high,urgent', 'search' => 'nullable|string|max:120']);
        $query = SupportCase::query()->with(['customer:id,name,email', 'assignee:id,name'])->withCount('messages')->latest('last_message_at');
        if ($data['status'] ?? null) {
            $query->where('status', $data['status']);
        } else {
            $query->whereNotIn('status', ['closed']);
        }
        if ($data['priority'] ?? null) {
            $query->where('priority', $data['priority']);
        }
        if ($search = trim($data['search'] ?? '')) {
            $query->where(fn ($q) => $q->where('reference', 'like', "%$search%")->orWhere('subject', 'like', "%$search%"));
        }

        return response()->json(['data' => $query->paginate(30)->through(fn ($case) => $this->present($case))]);
    }

    public function show(Request $request, SupportCase $supportCase): JsonResponse
    {
        $supportCase->update(['staff_read_at' => now()]);

        return response()->json(['data' => $this->present($supportCase->load(['customer:id,name,email', 'assignee:id,name', 'messages.sender:id,name']))]);
    }

    public function update(Request $request, SupportCase $supportCase): JsonResponse
    {
        $this->staff($request);
        $data = $request->validate(['status' => 'sometimes|in:open,waiting_for_support,waiting_for_customer,resolved,closed', 'priority' => 'sometimes|in:low,normal,high,urgent', 'assignedToUserId' => 'sometimes|nullable|integer|exists:users,id']);
        if (array_key_exists('assignedToUserId', $data) && $data['assignedToUserId']) {
            abort_unless(User::query()->whereKey($data['assignedToUserId'])->where('is_admin', true)->exists(), 422);
        }
        DB::transaction(function () use ($supportCase, $data): void {
            $updates = ['version' => $supportCase->version + 1];
            if (isset($data['status'])) {
                $updates['status'] = $data['status'];
                $updates['resolved_at'] = in_array($data['status'], ['resolved', 'closed'], true) ? now() : null;
            }
            if (isset($data['priority'])) {
                $updates['priority'] = $data['priority'];
            }
            if (array_key_exists('assignedToUserId', $data)) {
                $updates['assigned_to_user_id'] = $data['assignedToUserId'];
            }
            $supportCase->update($updates);
            $this->publish($supportCase, 'support.case.updated');
        });

        return response()->json(['data' => $this->present($supportCase->refresh()->load(['customer:id,name,email', 'assignee:id,name']))]);
    }

    public function reply(Request $request, SupportCase $supportCase): JsonResponse
    {
        $staff = $this->staff($request);
        $data = $request->validate(['message' => 'required|string|min:1|max:4000']);
        abort_if($supportCase->status === 'closed', 409, 'Reopen this case before replying.');
        DB::transaction(function () use ($supportCase, $staff, $data): void {
            $supportCase->messages()->create(['sender_user_id' => $staff->id, 'sender_role' => 'staff', 'body' => $data['message']]);
            $supportCase->update(['assigned_to_user_id' => $supportCase->assigned_to_user_id ?? $staff->id, 'status' => 'waiting_for_customer', 'customer_read_at' => null, 'staff_read_at' => now(), 'last_message_at' => now(), 'version' => $supportCase->version + 1]);
            $this->notifications->send($supportCase->customer_user_id, 'support.reply', 'KAILA Support replied', "There’s an update on {$supportCase->reference}.", 'support_case', $supportCase->id, ['caseId' => $supportCase->id], 'support');
            $this->publish($supportCase, 'support.message.created');
        });

        return response()->json(['data' => $this->present($supportCase->refresh()->load(['customer:id,name,email', 'assignee:id,name', 'messages.sender:id,name']))]);
    }

    private function publish(SupportCase $case, string $type): void
    {
        $this->outbox->record($type, 'support_case', $case->id, $case->version, ['rooms' => ["user:{$case->customer_user_id}"], 'caseId' => $case->id, 'status' => $case->status]);
    }

    private function staff(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->is_admin, 403);

        return $user;
    }

    /** @return array<string, mixed> */
    private function present(SupportCase $case): array
    {
        return ['id' => $case->id, 'reference' => $case->reference, 'subject' => $case->subject, 'category' => $case->category, 'status' => $case->status, 'priority' => $case->priority, 'jobId' => $case->service_job_id, 'customer' => $case->customer->only(['id', 'name', 'email']), 'assignedTo' => $case->assignee?->only(['id', 'name']), 'messageCount' => $case->messages_count ?? $case->messages->count(), 'lastMessageAt' => $case->last_message_at->toIso8601String(), 'createdAt' => $case->created_at?->toIso8601String(), 'messages' => $case->relationLoaded('messages') ? $case->messages->map(fn (SupportMessage $m) => ['id' => $m->id, 'body' => $m->body, 'senderRole' => $m->sender_role, 'senderName' => $m->sender_role === 'staff' ? 'KAILA Support' : $m->sender->name, 'createdAt' => $m->created_at?->toIso8601String()])->values() : null];
    }
}
