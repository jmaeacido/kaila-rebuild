<?php

namespace App\Contracts;

use App\Models\DurableNotification;
use App\Models\PushDevice;

interface PushTransport
{
    public function send(PushDevice $device, DurableNotification $notification): string;
}
