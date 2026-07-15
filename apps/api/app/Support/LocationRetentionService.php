<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class LocationRetentionService
{
    public function purgeExpiredSamples(): int
    {
        if (! Schema::hasTable('location_samples')) {
            return 0;
        }

        return DB::table('location_samples')
            ->where('captured_at', '<=', now()->subHours(24))
            ->where('dispute_hold', false)
            ->where('legal_hold', false)
            ->delete();
    }
}
