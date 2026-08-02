<?php

namespace App\Console\Commands;

use App\Support\MaintenanceService;
use Illuminate\Console\Command;

class ActivateScheduledMaintenance extends Command
{
    protected $signature = 'platform:activate-maintenance';

    protected $description = 'Activate scheduled platform maintenance when the countdown elapses';

    public function handle(MaintenanceService $maintenance): int
    {
        $row = $maintenance->activateDue();
        if ($row === null) {
            $this->info('No due maintenance window.');

            return self::SUCCESS;
        }

        $this->info('Maintenance activated.');

        return self::SUCCESS;
    }
}
