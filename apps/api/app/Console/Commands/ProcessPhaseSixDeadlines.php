<?php

namespace App\Console\Commands;

use App\Models\ServiceJob;
use App\Support\JobLifecycleService;
use Illuminate\Console\Command;
use Throwable;

class ProcessPhaseSixDeadlines extends Command
{
    protected $signature = 'phase-six:deadlines';

    protected $description = 'Idempotently process completion and review deadlines';

    public function handle(JobLifecycleService $service): int
    {
        $completed = 0;
        $closed = 0;
        ServiceJob::query()->where('status', 'completion_submitted')->where('auto_confirm_at', '<=', now())->each(function ($j) use ($service, &$completed) {
            try {
                $service->confirm($j, null, $j->completion_deadline_id);
                $completed++;
            } catch (Throwable) {
            }
        });
        ServiceJob::query()->where('status', 'completed')->where('review_closes_at', '<=', now())->each(function ($j) use ($service, &$closed) {
            try {
                $service->closeReviewWindow($j);
                $closed++;
            } catch (Throwable) {
            }
        });
        $this->info("Auto-confirmed: $completed; review windows closed: $closed");

        return self::SUCCESS;
    }
}
