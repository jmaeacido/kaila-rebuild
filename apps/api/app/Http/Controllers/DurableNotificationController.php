<?php

namespace App\Http\Controllers;

use App\Models\DurableNotification;
use App\Models\User;
use App\Support\OutboxRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DurableNotificationController
{
    public function __construct(private readonly OutboxRecorder $outbox) {}

    public function index(Request $request): JsonResponse
    {
        $query = DurableNotification::query()->where('user_id', $this->user($request)->id)->whereNull('cleared_at');

        return response()->json([
            'data' => (clone $query)->latest()->limit(100)->get()->map(fn (DurableNotification $notification): array => $this->serialize($notification)),
            'meta' => ['unreadCount' => (clone $query)->whereNull('read_at')->count()],
        ]);
    }

    public function readAll(Request $request): JsonResponse
    {
        $user = $this->user($request);
        DB::transaction(function () use ($user): void {
            DurableNotification::query()
                ->where('user_id', $user->id)
                ->whereNull('cleared_at')
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
            $this->recordStateChanged($user->id, 'notification.read_all', (string) $user->id);
        });

        return response()->json(['data' => ['read' => true]]);
    }

    public function read(Request $request, DurableNotification $notification): JsonResponse
    {
        $this->owns($request, $notification);
        DB::transaction(function () use ($notification): void {
            $notification->update(['read_at' => $notification->read_at ?? now()]);
            $this->recordStateChanged($notification->user_id, 'notification.read', $notification->id);
        });

        return response()->json(['data' => $notification]);
    }

    public function clear(Request $request, DurableNotification $notification): JsonResponse
    {
        $this->owns($request, $notification);
        DB::transaction(function () use ($notification): void {
            $notification->update(['cleared_at' => now()]);
            $this->recordStateChanged($notification->user_id, 'notification.cleared', $notification->id);
        });

        return response()->json(['data' => ['id' => $notification->id, 'cleared' => true]]);
    }

    private function owns(Request $request, DurableNotification $notification): void
    {
        abort_unless($notification->user_id === $this->user($request)->id, 404);
    }

    private function user(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }

    private function recordStateChanged(int $userId, string $event, string $resourceId): void
    {
        $this->outbox->record($event, 'notification', $resourceId, 1, [
            'rooms' => ["user:{$userId}"],
            'notificationId' => $resourceId,
        ]);
    }

    /** @return array<string, mixed> */
    private function serialize(DurableNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'title' => $notification->title,
            'body' => $notification->body,
            'resourceType' => $notification->resource_type,
            'resourceId' => $notification->resource_id,
            'data' => $notification->data,
            'readAt' => $notification->read_at?->toIso8601String(),
            'createdAt' => $notification->created_at?->toIso8601String(),
        ];
    }
}
