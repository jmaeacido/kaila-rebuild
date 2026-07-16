<?php

namespace App\Support;

use App\Contracts\PushTransport;
use App\Models\DurableNotification;
use App\Models\PushDevice;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class FcmPushTransport implements PushTransport
{
    public function send(PushDevice $device, DurableNotification $notification): string
    {
        $project = (string) config('services.fcm.project_id');
        $token = (string) config('services.fcm.access_token');
        if ($project === '' || $token === '') {
            throw new RuntimeException('FCM credentials are not configured.');
        }$response = Http::withToken($token)->timeout(10)->post("https://fcm.googleapis.com/v1/projects/{$project}/messages:send", ['message' => ['token' => $device->token_encrypted, 'notification' => ['title' => $notification->title, 'body' => $notification->body], 'data' => array_map('strval', array_merge($notification->data, ['notificationId' => $notification->id, 'resourceId' => $notification->resource_id]))]]);
        if (! $response->successful()) {
            throw new RuntimeException("FCM delivery failed with status {$response->status()}.");
        }

        return (string) $response->json('name');
    }
}
