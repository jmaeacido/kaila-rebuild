<?php

namespace App\Support;

use App\Contracts\PushTransport;
use App\Models\DurableNotification;
use App\Models\PushDevice;

class FakePushTransport implements PushTransport
{
    public function send(PushDevice $device, DurableNotification $notification): string
    {
        return "fake/{$notification->id}/{$device->id}";
    }
}
