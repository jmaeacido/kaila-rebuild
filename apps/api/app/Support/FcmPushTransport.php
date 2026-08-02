<?php

namespace App\Support;

use App\Contracts\PushTransport;
use App\Models\DurableNotification;
use App\Models\PushDevice;
use Illuminate\Support\Facades\Http;

class FcmPushTransport implements PushTransport
{
    public function __construct(private readonly FcmAccessTokenProvider $tokens) {}

    public function send(PushDevice $device, DurableNotification $notification): string
    {
        $project = (string) config('services.fcm.project_id');
        if ($project === '') {
            $project = $this->tokens->credentials()['project_id'];
        }

        $data = $notification->data ?? [];
        $silent = ($data['silent'] ?? null) === '1';
        $isCall = ($data['type'] ?? null) === 'call';
        $isCallCancel = $isCall && (($data['action'] ?? null) === 'cancel' || in_array((string) ($data['status'] ?? ''), ['declined', 'ended', 'active'], true));
        $channelId = $silent && ! $isCall ? 'kaila_silent' : match ($data['type'] ?? null) {
            'call' => 'kaila_calls_v2',
            'message' => 'kaila_messages',
            default => 'kaila_updates',
        };

        $payloadData = array_map('strval', array_merge($data, [
            'notificationId' => $notification->id,
            'resourceId' => $notification->resource_id,
            'title' => $notification->title,
            'body' => $notification->body,
            'channelId' => $channelId,
        ]));
        if ($isCallCancel) {
            $payloadData['action'] = 'cancel';
        }

        $message = [
            'token' => $device->token_encrypted,
            'android' => [
                'priority' => $silent && ! $isCall ? 'normal' : 'high',
                'ttl' => $isCall ? ($isCallCancel ? '30s' : '60s') : '86400s',
            ],
            'data' => $payloadData,
        ];

        // Calls are data-primary so the native messaging service can present a full-screen
        // ringtone UI when the app is backgrounded or killed. Cancel payloads stay data-only.
        if (! $isCall) {
            $message['notification'] = ['title' => $notification->title, 'body' => $notification->body];
            $message['android']['notification'] = [
                'channel_id' => $channelId,
                ...($silent ? [] : ['sound' => 'default']),
                'notification_priority' => $silent ? 'PRIORITY_DEFAULT' : 'PRIORITY_HIGH',
                'visibility' => 'PRIVATE',
                'tag' => "kaila-{$notification->id}",
            ];
        }

        $response = Http::withToken($this->tokens->token())->timeout(10)->post(
            "https://fcm.googleapis.com/v1/projects/{$project}/messages:send",
            ['message' => $message],
        );
        if (! $response->successful()) {
            $code = $response->json('error.details.0.errorCode') ?? $response->json('error.status');
            throw new FcmDeliveryException($response->status(), is_string($code) && $code !== '' ? $code : null);
        }

        return (string) $response->json('name');
    }
}
