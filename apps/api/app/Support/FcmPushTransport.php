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
        $callStatus = (string) ($data['status'] ?? '');
        $isCallCancel = $isCall && (($data['action'] ?? null) === 'cancel' || in_array($callStatus, ['declined', 'ended', 'active'], true));
        [$channelId, $sound] = $device->platform === 'admin_android'
            ? ['kaila_admin_actions_v2', 'default']
            : $this->channelAndSound($notification, $silent, $isCall);

        $payloadData = array_map('strval', array_merge($data, [
            'notificationId' => $notification->id,
            'resourceId' => $notification->resource_id,
            'title' => $notification->title,
            'body' => $notification->body,
            'channelId' => $channelId,
            'sound' => $sound ?? '',
        ]));
        if ($isCallCancel) {
            // An answered call only dismisses the ringing UI. It must never be
            // delivered to the WebView as a terminal cancel action.
            $payloadData['action'] = $callStatus === 'active' ? 'dismiss' : 'cancel';
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
                ...($silent || $sound === null ? [] : ['sound' => $sound]),
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

    /** @return array{0: string, 1: ?string} */
    private function channelAndSound(DurableNotification $notification, bool $silent, bool $isCall): array
    {
        if ($silent && ! $isCall) {
            return ['kaila_silent', null];
        }

        $routeType = (string) (($notification->data['type'] ?? null) ?: 'job');
        $eventType = (string) (($notification->data['eventType'] ?? null) ?: $notification->type);

        return match (true) {
            $isCall || $routeType === 'call' => ['kaila_calls_v3', 'kaila_call_ring'],
            $routeType === 'message' => ['kaila_messages_v1', 'kaila_message'],
            $eventType === 'opportunity.matched' => ['kaila_match_v1', 'kaila_job_match'],
            $eventType === 'offer.selected' => ['kaila_hired_v1', 'kaila_job_hired'],
            $eventType === 'offer.revised' => ['kaila_counters_v1', 'kaila_counter_offer'],
            $routeType === 'offer' => ['kaila_offers_v1', 'kaila_offer'],
            $routeType === 'travel' => ['kaila_travel_v1', 'kaila_travel'],
            $routeType === 'support' || $routeType === 'dispute' => ['kaila_support_v1', 'kaila_support'],
            default => ['kaila_updates_v1', 'kaila_job_update'],
        };
    }
}
