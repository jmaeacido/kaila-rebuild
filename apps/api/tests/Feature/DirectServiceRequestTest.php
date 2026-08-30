<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\OpportunityMatchingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DirectServiceRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_creates_private_request_and_only_recipient_can_access_it(): void
    {
        [$client, $providerUser, $profile, $category, $area] = $this->marketplace();

        $created = $this->actingAs($client)->postJson("/api/v1/providers/{$profile->id}/direct-requests", $this->requestPayload($category, $area))
            ->assertCreated()
            ->assertJsonPath('data.status', 'posted');
        $jobId = $created->json('data.id');

        $this->assertDatabaseHas('service_jobs', ['id' => $jobId, 'direct_provider_profile_id' => $profile->id]);
        $this->assertDatabaseHas('job_opportunities', ['service_job_id' => $jobId, 'provider_profile_id' => $profile->id]);
        $this->assertDatabaseHas('durable_notifications', ['user_id' => $providerUser->id, 'type' => 'direct_request.created']);
        $this->assertDatabaseCount('job_opportunities', 1);
        $this->actingAs($providerUser)->getJson("/api/v1/jobs/{$jobId}/conversation")->assertOk();
        $this->actingAs(User::factory()->create())->getJson("/api/v1/jobs/{$jobId}")->assertNotFound();
    }

    public function test_matching_and_provider_reconciliation_never_expose_a_direct_request_to_another_provider(): void
    {
        [$client, $providerUser, $profile, $category, $area] = $this->marketplace();
        $otherUser = User::factory()->create();
        $otherProfile = ProviderProfile::query()->create([
            'user_id' => $otherUser->id,
            'display_name' => 'Other Matching Provider',
            'bio' => str_repeat('Experienced local provider. ', 2),
            'status' => 'active',
        ]);
        $otherProfile->services()->attach($category->id);
        $otherProfile->serviceAreas()->attach($area->id);

        $jobId = $this->actingAs($client)
            ->postJson("/api/v1/providers/{$profile->id}/direct-requests", $this->requestPayload($category, $area))
            ->assertCreated()
            ->json('data.id');
        $job = ServiceJob::query()->findOrFail($jobId);
        $matching = app(OpportunityMatchingService::class);

        $matching->matchJob($job, $client->id);
        $matching->reconcileProvider($otherProfile);

        $this->assertDatabaseCount('job_opportunities', 1);
        $this->assertDatabaseMissing('job_opportunities', ['service_job_id' => $jobId, 'provider_profile_id' => $otherProfile->id]);
        $this->assertDatabaseMissing('durable_notifications', ['user_id' => $otherUser->id, 'subject_id' => $jobId]);
        $this->actingAs($providerUser)->getJson('/api/v1/opportunities')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.jobId', $jobId);
        $this->actingAs($providerUser)->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.type', 'direct_request.created');
        $this->actingAs($otherUser)->getJson('/api/v1/opportunities')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->actingAs($otherUser)->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->actingAs($otherUser)->getJson("/api/v1/jobs/{$jobId}")->assertNotFound();
        $this->actingAs($providerUser)->getJson("/api/v1/jobs/{$jobId}")->assertOk();
    }

    public function test_recipient_can_accept_into_existing_job_lifecycle(): void
    {
        [$client, $providerUser, $profile, $category, $area] = $this->marketplace();
        $jobId = $this->actingAs($client)->postJson("/api/v1/providers/{$profile->id}/direct-requests", $this->requestPayload($category, $area))->json('data.id');

        $this->actingAs($providerUser)->postJson("/api/v1/jobs/{$jobId}/direct-request/accept", [
            'availabilityText' => 'Tomorrow morning',
            'estimatedDurationText' => 'Two hours',
        ])->assertOk()->assertJsonPath('data.status', 'provider_selected');

        $this->assertDatabaseHas('accepted_offer_snapshots', ['service_job_id' => $jobId, 'provider_profile_id' => $profile->id, 'amount_centavos' => 150000]);
        $this->assertDatabaseHas('service_jobs', ['id' => $jobId, 'status' => 'provider_selected']);
    }

    /** @return array{User, User, ProviderProfile, ServiceCategory, Area} */
    private function marketplace(): array
    {
        $category = ServiceCategory::query()->create(['name' => 'Plumbing', 'slug' => 'plumbing', 'icon' => 'droplets', 'is_active' => true]);
        $area = Area::query()->create(['name' => 'Butuan City', 'type' => 'city', 'code' => 'BUT', 'is_active' => true]);
        $client = User::factory()->create();
        $providerUser = User::factory()->create();
        $profile = ProviderProfile::query()->create(['user_id' => $providerUser->id, 'display_name' => 'Direct Provider', 'bio' => str_repeat('Experienced local provider. ', 2), 'status' => 'active']);
        $profile->services()->attach($category->id);
        $profile->serviceAreas()->attach($area->id);

        return [$client, $providerUser, $profile, $category, $area];
    }

    /** @return array<string, mixed> */
    private function requestPayload(ServiceCategory $category, Area $area): array
    {
        return [
            'title' => 'Repair a leaking tap', 'description' => 'The kitchen tap has been leaking since yesterday.',
            'categoryId' => $category->id, 'areaId' => $area->id, 'scheduleType' => 'asap',
            'budgetMinCentavos' => 100000, 'budgetMaxCentavos' => 150000,
            'latitude' => 8.9475, 'longitude' => 125.5406, 'addressLabel' => 'Near city hall',
        ];
    }
}
