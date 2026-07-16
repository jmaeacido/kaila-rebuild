<?php

namespace Tests\Feature\Retention;

use App\Jobs\PurgeExpiredLocationSamples;
use App\Models\Area;
use App\Models\ServiceCategory;
use App\Models\ServiceJob;
use App\Models\TravelSession;
use App\Models\User;
use App\Support\LocationRetentionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
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
        $user = User::factory()->create();
        $category = ServiceCategory::query()->create(['name' => 'Test', 'slug' => 'test', 'icon' => 'Wrench', 'is_active' => true]);
        $area = Area::query()->create(['type' => 'city', 'name' => 'Test City', 'code' => 'TEST', 'is_active' => true]);
        $job = ServiceJob::query()->create(['id' => (string) Str::uuid(), 'client_user_id' => $user->id, 'service_category_id' => $category->id, 'area_id' => $area->id, 'title' => 'Retention test', 'description' => 'Retention test job.', 'schedule_type' => 'asap']);
        $travel = TravelSession::query()->create(['id' => (string) Str::uuid(), 'service_job_id' => $job->id, 'provider_user_id' => $user->id, 'consent_confirmed' => true, 'started_at' => now()]);
        DB::table('location_samples')->insert([
            ['travel_session_id' => $travel->id, 'latitude' => 7, 'longitude' => 125, 'accuracy_meters' => 10, 'captured_at' => now()->subHours(25), 'dispute_hold' => false, 'legal_hold' => false],
            ['travel_session_id' => $travel->id, 'latitude' => 7, 'longitude' => 125, 'accuracy_meters' => 10, 'captured_at' => now()->subHours(25), 'dispute_hold' => true, 'legal_hold' => false],
            ['travel_session_id' => $travel->id, 'latitude' => 7, 'longitude' => 125, 'accuracy_meters' => 10, 'captured_at' => now()->subHours(25), 'dispute_hold' => false, 'legal_hold' => true],
            ['travel_session_id' => $travel->id, 'latitude' => 7, 'longitude' => 125, 'accuracy_meters' => 10, 'captured_at' => now()->subHours(23), 'dispute_hold' => false, 'legal_hold' => false],
        ]);

        $this->assertSame(1, (new LocationRetentionService)->purgeExpiredSamples());
        $this->assertDatabaseCount('location_samples', 3);
    }
}
