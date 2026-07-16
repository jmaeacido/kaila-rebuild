<?php

use App\Jobs\PurgeExpiredLocationSamples;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('phase-six:deadlines')->everyMinute()->withoutOverlapping();

Schedule::command('outbox:dispatch')
    ->everyMinute()
    ->withoutOverlapping();

Schedule::job(new PurgeExpiredLocationSamples, 'maintenance')
    ->hourly()
    ->withoutOverlapping();
