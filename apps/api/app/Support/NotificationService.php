<?php

namespace App\Support;

use App\Jobs\DeliverPushNotification;
use App\Models\DurableNotification;
use App\Models\NotificationPreference;
use App\Models\PushDeliveryAttempt;
use App\Models\PushDevice;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class NotificationService
{
    public function __construct(private readonly OutboxRecorder $outbox) {}

    /** @param array<string, scalar|null> $data */
    public function send(
        int $userId,
        string $type,
        string $title,
        string $body,
        string $resourceType,
        string $resourceId,
        array $data = [],
        string $channel = 'material',
    ): DurableNotification {
        $routeType = $this->routeType($type);
        $notification = DurableNotification::query()->create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'data' => [...$data, 'type' => $routeType],
        ]);

        if ($this->allowsPush($userId, $channel)) {
            $silent = $this->isQuietHours($userId);
            if ($silent) {
                $notification->update(['data' => [...$notification->data, 'silent' => '1']]);
            }
            foreach (PushDevice::query()->where('user_id', $userId)->whereNull('revoked_at')->get() as $device) {
                $attempt = PushDeliveryAttempt::query()->create([
                    'notification_id' => $notification->id,
                    'push_device_id' => $device->id,
                    'attempt' => 1,
                ]);
                DB::afterCommit(fn () => DeliverPushNotification::dispatch($attempt->id));
            }
        }

        $this->outbox->record('notification.created', 'notification', $notification->id, 1, [
            'rooms' => ["user:{$userId}"],
            'notification' => [
                'id' => $notification->id,
                'type' => $type,
                'title' => $title,
                'body' => $body,
                'resourceType' => $resourceType,
                'resourceId' => $resourceId,
                'data' => $notification->data,
                'readAt' => null,
                'createdAt' => $notification->created_at?->toIso8601String(),
            ],
        ]);

        return $notification;
    }

    private function allowsPush(int $userId, string $channel): bool
    {
        $preference = NotificationPreference::query()->find($userId);

        return match ($channel) {
            'message' => ! ($preference->mute_messages ?? false),
            'routine' => ! ($preference->mute_routine_reminders ?? false),
            default => true,
        };
    }

    private function isQuietHours(int $userId): bool
    {
        $preference = NotificationPreference::query()->find($userId);
        if (! $preference?->quiet_hours_start || ! $preference->quiet_hours_end) {
            return false;
        }
        $now = CarbonImmutable::now($preference->timezone ?: 'Asia/Manila');
        $start = CarbonImmutable::parse($preference->quiet_hours_start, $now->timezone)->setDate($now->year, $now->month, $now->day);
        $end = CarbonImmutable::parse($preference->quiet_hours_end, $now->timezone)->setDate($now->year, $now->month, $now->day);

        return $start->lessThan($end)
            ? $now->betweenIncluded($start, $end)
            : $now->greaterThanOrEqualTo($start) || $now->lessThanOrEqualTo($end);
    }

    private function routeType(string $type): string
    {
        return match (true) {
            str_starts_with($type, 'offer.') => 'offer',
            str_starts_with($type, 'message.') => 'message',
            str_starts_with($type, 'call.') => 'call',
            str_starts_with($type, 'travel.') => 'travel',
            str_starts_with($type, 'completion.') => 'completion',
            str_starts_with($type, 'dispute.') => 'dispute',
            str_starts_with($type, 'review') => 'review',
            str_starts_with($type, 'security.') => 'security',
            str_starts_with($type, 'support.') => 'support',
            default => 'job',
        };
    }
}
