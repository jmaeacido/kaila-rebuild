<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\JobAsset;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PhaseThreeJobsTest extends TestCase
{
    use RefreshDatabase;

    public function test_posting_is_idempotent_and_matches_only_eligible_providers(): void
    {
        [$category, $area] = $this->references();
        $eligible = $this->provider($category, $area, 'active');
        $this->provider($category, Area::query()->create(['type' => 'city', 'name' => 'Tagum', 'code' => 'TAG', 'is_active' => true]), 'active');
        $this->provider($category, $area, 'pending_review');
        $client = User::factory()->create();

        $first = $this->actingAs($client)->withHeader('Idempotency-Key', 'post-job-1')->postJson('/api/v1/jobs', $this->draft($category, $area))->assertCreated();
        $second = $this->withHeader('Idempotency-Key', 'post-job-1')->postJson('/api/v1/jobs', $this->draft($category, $area))->assertOk();
        $this->assertSame($first->json('data.id'), $second->json('data.id'));

        $this->postJson("/api/v1/jobs/{$first->json('data.id')}/post")->assertOk();
        $this->assertDatabaseCount('job_opportunities', 1);
        $this->assertDatabaseHas('job_opportunities', ['provider_profile_id' => $eligible->id]);
        $this->assertDatabaseHas('durable_notifications', ['user_id' => $eligible->user_id, 'type' => 'opportunity.matched']);
        $this->assertDatabaseCount('job_timeline_events', 2);
    }

    public function test_opportunity_never_leaks_exact_location_or_client_identity(): void
    {
        [$category, $area] = $this->references();
        $provider = $this->provider($category, $area, 'active');
        $client = User::factory()->create();
        $created = $this->actingAs($client)->withHeader('Idempotency-Key', 'privacy')->postJson('/api/v1/jobs', $this->draft($category, $area))->assertCreated();
        $this->postJson("/api/v1/jobs/{$created->json('data.id')}/post")->assertOk();
        $response = $this->actingAs(User::query()->findOrFail($provider->user_id))->getJson('/api/v1/opportunities')->assertOk()->assertJsonCount(1, 'data');
        $response->assertJsonMissingPath('data.0.location')->assertJsonMissingPath('data.0.addressLabel')->assertJsonMissingPath('data.0.clientUserId')->assertJsonPath('data.0.area.name', 'Davao City');
    }

    public function test_provider_covering_a_whole_city_matches_a_job_in_its_barangay(): void
    {
        [$category, $city] = $this->references();
        $barangay = Area::query()->create(['parent_id' => $city->id, 'type' => 'barangay', 'name' => 'Barangay One', 'code' => 'DVO-001', 'is_active' => true]);
        $provider = $this->provider($category, $city, 'active');
        $client = User::factory()->create();

        $created = $this->actingAs($client)
            ->withHeader('Idempotency-Key', 'city-wide-coverage')
            ->postJson('/api/v1/jobs', $this->draft($category, $barangay))
            ->assertCreated();
        $this->postJson("/api/v1/jobs/{$created->json('data.id')}/post")->assertOk();

        $this->assertDatabaseHas('job_opportunities', ['provider_profile_id' => $provider->id]);
    }

    public function test_cross_user_access_and_idempotency_key_reuse_are_rejected(): void
    {
        [$category, $area] = $this->references();
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $created = $this->actingAs($owner)->withHeader('Idempotency-Key', 'same')->postJson('/api/v1/jobs', $this->draft($category, $area))->assertCreated();
        $changed = $this->draft($category, $area);
        $changed['title'] = 'Different work';
        $this->withHeader('Idempotency-Key', 'same')->postJson('/api/v1/jobs', $changed)->assertConflict();
        $this->actingAs($other)->getJson("/api/v1/jobs/{$created->json('data.id')}")->assertNotFound();
        $this->putJson("/api/v1/jobs/{$created->json('data.id')}", $this->draft($category, $area))->assertNotFound();
    }

    public function test_client_can_edit_a_posted_job_before_any_offer_exists(): void
    {
        [$category, $area] = $this->references();
        $client = User::factory()->create();
        $created = $this->actingAs($client)->withHeader('Idempotency-Key', 'editable-posted')->postJson('/api/v1/jobs', $this->draft($category, $area))->assertCreated();
        $this->postJson("/api/v1/jobs/{$created->json('data.id')}/post")->assertOk();
        $updated = $this->draft($category, $area);
        $updated['title'] = 'Updated leaking tap details';

        $this->putJson("/api/v1/jobs/{$created->json('data.id')}", $updated)
            ->assertOk()
            ->assertJsonPath('data.title', 'Updated leaking tap details')
            ->assertJsonPath('data.canEdit', true);
        $this->assertDatabaseHas('job_timeline_events', ['service_job_id' => $created->json('data.id'), 'event_type' => 'job.updated']);
    }

    public function test_client_can_cancel_a_draft_job(): void
    {
        [$category, $area] = $this->references();
        $client = User::factory()->create();
        $created = $this->actingAs($client)->withHeader('Idempotency-Key', 'cancel-draft')->postJson('/api/v1/jobs', $this->draft($category, $area))->assertCreated();

        $this->postJson("/api/v1/jobs/{$created->json('data.id')}/cancel", ['reason' => 'I no longer need this service request.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
    }

    public function test_job_attachments_are_limited_private_and_quarantined(): void
    {
        Storage::fake('private-assets');
        [$category, $area] = $this->references();
        $client = User::factory()->create();
        $created = $this->actingAs($client)->withHeader('Idempotency-Key', 'asset')->postJson('/api/v1/jobs', $this->draft($category, $area))->assertCreated();
        $uploaded = $this->postJson("/api/v1/jobs/{$created->json('data.id')}/assets", ['file' => UploadedFile::fake()->image('leak.jpg', 640, 480)])->assertCreated()->assertJsonPath('data.scan_status', 'pending');
        $assetId = $uploaded->json('data.id');
        $this->get("/api/v1/job-assets/{$assetId}")->assertNotFound();
        JobAsset::query()->findOrFail($assetId)->update(['scan_status' => 'clean']);
        $this->get("/api/v1/job-assets/{$assetId}")->assertOk();
        $this->actingAs(User::factory()->create())->get("/api/v1/job-assets/{$assetId}")->assertNotFound();
        $this->actingAs($client);
        $this->postJson("/api/v1/jobs/{$created->json('data.id')}/assets", ['file' => UploadedFile::fake()->create('leak.mp4', 100, 'video/mp4')])->assertCreated()->assertJsonPath('data.mime_type', 'video/mp4');
        $this->postJson("/api/v1/jobs/{$created->json('data.id')}/assets", ['file' => UploadedFile::fake()->create('instructions.pdf', 100, 'application/pdf')])->assertUnprocessable();
        $this->assertDatabaseHas('job_assets', ['service_job_id' => $created->json('data.id'), 'scan_status' => 'pending']);
        $this->postJson("/api/v1/jobs/{$created->json('data.id')}/post")->assertOk();
        $this->postJson("/api/v1/jobs/{$created->json('data.id')}/assets", ['file' => UploadedFile::fake()->image('late.jpg')])->assertConflict();
    }

    /** @return array{ServiceCategory, Area} */
    private function references(): array
    {
        return [ServiceCategory::query()->create(['name' => 'Plumbing', 'slug' => 'plumbing', 'icon' => 'Wrench', 'is_active' => true]), Area::query()->create(['type' => 'city', 'name' => 'Davao City', 'code' => 'DVO', 'is_active' => true])];
    }

    private function provider(ServiceCategory $category, Area $area, string $status): ProviderProfile
    {
        $profile = ProviderProfile::query()->create(['user_id' => User::factory()->create()->id, 'display_name' => 'Provider', 'bio' => 'Experienced provider for local household service work.', 'status' => $status, 'years_experience' => 3]);
        $profile->services()->attach($category);
        $profile->serviceAreas()->attach($area);

        return $profile;
    }

    /** @return array<string, mixed> */
    private function draft(ServiceCategory $category, Area $area): array
    {
        return ['title' => 'Fix leaking tap', 'description' => 'The kitchen tap has a steady leak near the handle.', 'categoryId' => $category->id, 'areaId' => $area->id, 'scheduleType' => 'asap', 'scheduledAt' => null, 'budgetMinCentavos' => 50000, 'budgetMaxCentavos' => 120000, 'latitude' => 7.0707, 'longitude' => 125.6087, 'addressLabel' => 'Near the community hall'];
    }
}
