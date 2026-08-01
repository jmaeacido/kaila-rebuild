<?php

namespace App\Http\Controllers;

use App\Models\ServiceJob;
use App\Models\SupportCase;
use App\Models\SupportMessage;
use App\Models\User;
use App\Support\HiredJobAccess;
use App\Support\OutboxRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SupportCaseController extends Controller
{
    public function __construct(private readonly OutboxRecorder $outbox, private readonly HiredJobAccess $jobAccess) {}

    public function index(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $items = SupportCase::query()->where('customer_user_id', $user->id)->withCount('messages')->latest('last_message_at')->get()->map(fn ($case) => $this->present($case));

        return response()->json(['data' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $data = $request->validate(['category' => 'required|in:account,booking,payment,provider,technical,feedback,other', 'subject' => 'required|string|min:5|max:120', 'message' => 'required|string|min:10|max:4000', 'jobId' => 'nullable|uuid']);
        if (! empty($data['jobId'])) {
            $job = ServiceJob::query()->whereKey($data['jobId'])->firstOrFail();
            if ($job->client_user_id !== $user->id) {
                $this->jobAccess->requireParticipant($job, $user);
            }
        }
        $case = DB::transaction(function () use ($data, $user): SupportCase {
            $case = SupportCase::query()->create(['reference' => $this->reference(), 'customer_user_id' => $user->id, 'service_job_id' => $data['jobId'] ?? null, 'category' => $data['category'], 'subject' => $data['subject'], 'last_message_at' => now(), 'customer_read_at' => now()]);
            $case->messages()->create(['sender_user_id' => $user->id, 'sender_role' => 'customer', 'body' => $data['message']]);
            $this->publish($case, 'support.case.created');

            return $case;
        });

        return response()->json(['data' => $this->present($case->load(['messages.sender', 'assignee']))], 201);
    }

    public function show(Request $request, SupportCase $supportCase): JsonResponse
    {
        $user = $this->user($request);
        abort_unless($supportCase->customer_user_id === $user->id, 404);
        $supportCase->update(['customer_read_at' => now()]);

        return response()->json(['data' => $this->present($supportCase->load(['messages.sender', 'assignee']))]);
    }

    public function reply(Request $request, SupportCase $supportCase): JsonResponse
    {
        $user = $this->user($request);
        abort_unless($supportCase->customer_user_id === $user->id, 404);
        abort_if($supportCase->status === 'closed', 409, 'Reopen this request before replying.');
        $data = $request->validate(['message' => 'required|string|min:1|max:4000']);
        DB::transaction(function () use ($supportCase, $user, $data): void {
            $supportCase->messages()->create(['sender_user_id' => $user->id, 'sender_role' => 'customer', 'body' => $data['message']]);
            $supportCase->update(['status' => 'waiting_for_support', 'staff_read_at' => null, 'customer_read_at' => now(), 'last_message_at' => now(), 'version' => $supportCase->version + 1]);
            $this->publish($supportCase, 'support.message.created');
        });

        return response()->json(['data' => $this->present($supportCase->refresh()->load(['messages.sender', 'assignee']))]);
    }

    public function close(Request $request, SupportCase $supportCase): JsonResponse
    {
        return $this->customerStatus($request, $supportCase, 'closed');
    }

    public function reopen(Request $request, SupportCase $supportCase): JsonResponse
    {
        return $this->customerStatus($request, $supportCase, 'waiting_for_support');
    }

    private function customerStatus(Request $request, SupportCase $case, string $status): JsonResponse
    {
        $user = $this->user($request);
        abort_unless($case->customer_user_id === $user->id, 404);
        DB::transaction(function () use ($case, $status): void {
            $case->update(['status' => $status, 'resolved_at' => $status === 'closed' ? now() : null, 'version' => $case->version + 1]);
            $this->publish($case, "support.case.$status");
        });

        return response()->json(['data' => $this->present($case->refresh())]);
    }

    private function publish(SupportCase $case, string $type): void
    {
        $staff = User::query()->where('is_admin', true)->pluck('id')->map(fn ($id) => "user:$id")->all();
        $this->outbox->record($type, 'support_case', $case->id, $case->version, ['rooms' => ["user:{$case->customer_user_id}", ...$staff], 'caseId' => $case->id, 'status' => $case->status]);
    }

    private function reference(): string
    {
        do {
            $value = 'KLA-'.now()->format('ymd').'-'.Str::upper(Str::random(5));
        } while (SupportCase::query()->where('reference', $value)->exists());

        return $value;
    }

    private function user(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }

    /** @return array<string, mixed> */
    private function present(SupportCase $case): array
    {
        return ['id' => $case->id, 'reference' => $case->reference, 'category' => $case->category, 'subject' => $case->subject, 'status' => $case->status, 'priority' => $case->priority, 'jobId' => $case->service_job_id, 'assignedTo' => $case->assignee?->name, 'unread' => $case->staff_read_at && (! $case->customer_read_at || $case->staff_read_at->gt($case->customer_read_at)), 'messageCount' => $case->messages_count ?? $case->messages->count(), 'lastMessageAt' => $case->last_message_at->toIso8601String(), 'createdAt' => $case->created_at?->toIso8601String(), 'messages' => $case->relationLoaded('messages') ? $case->messages->map(fn (SupportMessage $message) => ['id' => $message->id, 'body' => $message->body, 'senderRole' => $message->sender_role, 'senderName' => $message->sender_role === 'staff' ? 'KAILA Support' : $message->sender->name, 'createdAt' => $message->created_at?->toIso8601String()])->values() : null];
    }
}
