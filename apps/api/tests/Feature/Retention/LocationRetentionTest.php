<?php

namespace Tests\Feature\Retention;

use App\Jobs\PurgeExpiredLocationSamples;
use App\Support\LocationRetentionService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class LocationRetentionTest extends TestCase
{
    use RefreshDatabase;

    public function test_retention_job_is_safe_before_location_feature_tables_exist(): void
    {
        (new PurgeExpiredLocationSamples)->handle(new LocationRetentionService);

        $this->assertDatabaseHas('retention_runs', [
            'policy' => 'location_samples_24_hours',
            'status' => 'completed',
            'deleted_records' => 0,
        ]);
    }

    public function test_expired_samples_are_deleted_unless_a_dispute_or_legal_hold_applies(): void
    {
        Schema::create('location_samples', function (Blueprint $table): void {
            $table->id();
            $table->timestamp('captured_at');
            $table->boolean('dispute_hold')->default(false);
            $table->boolean('legal_hold')->default(false);
        });

        try {
            DB::table('location_samples')->insert([
                ['captured_at' => now()->subHours(25), 'dispute_hold' => false, 'legal_hold' => false],
                ['captured_at' => now()->subHours(25), 'dispute_hold' => true, 'legal_hold' => false],
                ['captured_at' => now()->subHours(25), 'dispute_hold' => false, 'legal_hold' => true],
                ['captured_at' => now()->subHours(23), 'dispute_hold' => false, 'legal_hold' => false],
            ]);

            $this->assertSame(1, (new LocationRetentionService)->purgeExpiredSamples());
            $this->assertDatabaseCount('location_samples', 3);
        } finally {
            Schema::drop('location_samples');
        }
    }
}
