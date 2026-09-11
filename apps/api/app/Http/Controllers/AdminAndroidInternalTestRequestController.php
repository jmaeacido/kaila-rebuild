<?php

namespace App\Http\Controllers;

use App\Models\AndroidInternalTestRequest;
use App\Models\User;
use App\Notifications\BrandedAndroidInternalTestInvite;
use App\Support\NotificationService;
use App\Support\StaffAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;

class AdminAndroidInternalTestRequestController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User && StaffAuthorization::canAccessOperations($actor), 403);

        $validated = $request->validate([
            'status' => ['nullable', Rule::in([
                AndroidInternalTestRequest::STATUS_PENDING,
                AndroidInternalTestRequest::STATUS_INVITED,
                AndroidInternalTestRequest::STATUS_DISMISSED,
                'all',
            ])],
        ]);

        $status = $validated['status'] ?? AndroidInternalTestRequest::STATUS_PENDING;
        $query = AndroidInternalTestRequest::query()
            ->with('inviter:id,name')
            ->orderByDesc('created_at');

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $items = $query->limit(100)->get();

        $summary = [
            'pending' => AndroidInternalTestRequest::query()->where('status', AndroidInternalTestRequest::STATUS_PENDING)->count(),
            'invited' => AndroidInternalTestRequest::query()->where('status', AndroidInternalTestRequest::STATUS_INVITED)->count(),
            'dismissed' => AndroidInternalTestRequest::query()->where('status', AndroidInternalTestRequest::STATUS_DISMISSED)->count(),
        ];

        return response()->json([
            'data' => [
                'items' => $items->map(fn (AndroidInternalTestRequest $row) => $this->present($row))->values(),
                'summary' => $summary,
            ],
        ]);
    }

    public function invite(Request $request, AndroidInternalTestRequest $androidInternalTestRequest): JsonResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User && StaffAuthorization::canSendOpsMail($actor), 403);

        $existing = User::query()
            ->whereRaw('LOWER(email) = ?', [$androidInternalTestRequest->email])
            ->where(function ($query): void {
                $query->whereNull('account_status')
                    ->orWhere('account_status', '!=', 'deleted');
            })
            ->whereNull('deleted_at')
            ->first();

        $mail = new BrandedAndroidInternalTestInvite($androidInternalTestRequest->name);
        if ($existing instanceof User) {
            $existing->notify($mail);
            $this->notifications->send(
                (int) $existing->id,
                AdminMailController::INBOX_EVENT_TYPE,
                "You're invited to test KAILA on Android",
                'KAILA invited you to join Android internal testing. Open this update, become a tester on Google Play, then install the app.',
                AdminMailController::INBOX_RESOURCE_TYPE,
                AdminMailController::INBOX_RESOURCE_ID,
                [
                    'inviteKind' => 'android_internal_test',
                    'playTestUrl' => (string) config('kaila.android_internal_test_url'),
                ],
            );
        } else {
            Notification::route('mail', $androidInternalTestRequest->email)->notify($mail);
        }

        $androidInternalTestRequest->forceFill([
            'status' => AndroidInternalTestRequest::STATUS_INVITED,
            'invited_by' => $actor->id,
            'invited_at' => now(),
        ])->save();
        $androidInternalTestRequest->load(['inviter:id,name']);

        return response()->json([
            'data' => $this->present($androidInternalTestRequest),
        ]);
    }

    public function update(Request $request, AndroidInternalTestRequest $androidInternalTestRequest): JsonResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User && StaffAuthorization::canAccessOperations($actor), 403);

        $validated = $request->validate([
            'status' => ['required', Rule::in([
                AndroidInternalTestRequest::STATUS_PENDING,
                AndroidInternalTestRequest::STATUS_DISMISSED,
            ])],
        ]);

        $androidInternalTestRequest->forceFill([
            'status' => $validated['status'],
            'invited_by' => $validated['status'] === AndroidInternalTestRequest::STATUS_PENDING
                ? null
                : $androidInternalTestRequest->invited_by,
            'invited_at' => $validated['status'] === AndroidInternalTestRequest::STATUS_PENDING
                ? null
                : $androidInternalTestRequest->invited_at,
        ])->save();
        $androidInternalTestRequest->load(['inviter:id,name']);

        return response()->json([
            'data' => $this->present($androidInternalTestRequest),
        ]);
    }

    /** @return array<string, mixed> */
    private function present(AndroidInternalTestRequest $row): array
    {
        return [
            'id' => $row->id,
            'name' => $row->name,
            'email' => $row->email,
            'note' => $row->note,
            'status' => $row->status,
            'submittedAt' => $row->created_at?->toIso8601String(),
            'invitedAt' => $row->invited_at?->toIso8601String(),
            'invitedBy' => $row->inviter !== null
                ? ['id' => (string) $row->inviter->id, 'name' => $row->inviter->name]
                : null,
        ];
    }
}
