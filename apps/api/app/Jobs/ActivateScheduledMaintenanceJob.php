<?php

namespace App\Jobs;

use App\Support\MaintenanceService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ActivateScheduledMaintenanceJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly int $maintenanceId) {}

    public function handle(MaintenanceService $maintenance): void
    {
        $row = $maintenance->current();
        if ((int) $row->getKey() !== $this->maintenanceId) {
            return;
        }
        if ($row->phase !== MaintenanceService::PHASE_SCHEDULED) {
            return;
        }

        $maintenance->activateDue();
    }
}
