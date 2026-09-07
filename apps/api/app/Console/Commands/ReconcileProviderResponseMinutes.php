<?php

namespace App\Console\Commands;

use App\Models\ProviderProfile;
use Illuminate\Console\Command;

class ReconcileProviderResponseMinutes extends Command
{
    protected $signature = 'providers:reconcile-response-minutes';

    protected $description = 'Rebuild provider_profiles.response_minutes from first-offer response samples';

    public function handle(): int
    {
        $updated = 0;

        ProviderProfile::query()->orderBy('id')->chunkById(100, function ($profiles) use (&$updated): void {
            foreach ($profiles as $profile) {
                $before = $profile->response_minutes;
                $after = $profile->refreshResponseMinutes();
                if ($before !== $after) {
                    $updated++;
                }
            }
        });

        $this->info("Reconciled response_minutes on {$updated} provider profile(s).");

        return self::SUCCESS;
    }
}
