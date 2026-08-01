<?php

namespace App\Support;

use App\Contracts\PushTransport;
use App\Models\DurableNotification;
use App\Models\PushDevice;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class FcmPushTransport implements PushTransport
{
    public function __construct(private readonly FcmAccessTokenProvider $tokens) {}

    public function send(PushDevice $device, DurableNotification $notification): string
    {
        $project = (string) config('services.fcm.project_id');
        if ($project === '') {
            $project = $this->tokens->credentials()['project_id'];
        }

        $silent = ($notification->data['silent'] ?? null) === '1';
        $channelId = $silent ? 'kaila_silent' : match ($notification->data['type'] ?? null) {
            'call' => 'kaila_calls',
            'message' => 'kaila_messages',
            default => 'kaila_updates',
        };
        $response = Http::withToken($this->tokens->token())->timeout(10)->post("https://fcm.googleapis.com/v1/projects/{$project}/messages:send", ['message' => [
            'token' => $device->token_encrypted,
            'notification' => ['title' => $notification->title, 'body' => $notification->body],
            'android' => [
                'priority' => $silent ? 'normal' : 'high',
                'ttl' => '86400s',
                'notification' => [
                    'channel_id' => $channelId,
                    ...($silent ? [] : ['sound' => 'default']),
                    'notification_priority' => $silent ? 'PRIORITY_DEFAULT' : 'PRIORITY_HIGH',
                    'visibility' => 'PRIVATE',
                    'tag' => "kaila-{$notification->id}",
                ],
            ],
            'data' => array_map('strval', array_merge($notification->data, ['notificationId' => $notification->id, 'resourceId' => $notification->resource_id])),
        ]]);
        if (! $response->successful()) {
            $code = $response->json('error.details.0.errorCode') ?? $response->json('error.status');
            $reason = is_string($code) && $code !== '' ? " ({$code})" : '';
            throw new RuntimeException("FCM delivery failed with status {$response->status()}{$reason}.");
        }

        return (string) $response->json('name');
    }
}
