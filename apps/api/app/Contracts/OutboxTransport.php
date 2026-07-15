<?php

namespace App\Contracts;

use App\Models\OutboxEvent;

interface OutboxTransport
{
    public function publish(OutboxEvent $event): void;
}
