<?php

namespace App\Support;

use App\Models\User;

class AdminNotificationService
{
    public function __construct(private readonly NotificationService $notifications) {}

    /** @param array<string, scalar|null> $data */
    public function send(
        string $type,
        string $title,
        string $body,
        string $resourceType,
        string $resourceId,
        array $data = [],
    ): void {
        User::query()->where('is_admin', true)->pluck('id')->each(
            fn (int $staffId) => $this->notifications->send(
                $staffId,
                $type,
                $title,
                $body,
                $resourceType,
                $resourceId,
                $data,
            ),
        );
    }
}
