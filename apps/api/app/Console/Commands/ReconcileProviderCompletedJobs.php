<?php

namespace App\Console\Commands;

use App\Models\ProviderProfile;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ReconcileProviderCompletedJobs extends Command
{
    protected $signature = 'providers:reconcile-completed-jobs';

    protected $description = 'Rebuild provider_profiles.completed_jobs from completed accepted jobs';

    public function handle(): int
    {
        $updated = 0;

        ProviderProfile::query()->orderBy('id')->chunkById(100, function ($profiles) use (&$updated): void {
            foreach ($profiles as $profile) {
                $count = $profile->completedJobsCount();
                if ((int) $profile->completed_jobs === $count) {
                    continue;
                }

                DB::table('provider_profiles')
                    ->where('id', $profile->id)
                    ->update(['completed_jobs' => $count, 'updated_at' => now()]);
                $updated++;
            }
        });

        $this->info("Reconciled completed_jobs on {$updated} provider profile(s).");

        return self::SUCCESS;
    }
}
