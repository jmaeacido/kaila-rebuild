<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PhaseFiveCommunicationTravelTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_selected_participants_can_reconcile_and_send_ordered_messages(): void
    {
        [$job,$client,$provider,$outsider] = $this->selectedJob();
        $this->actingAs($outsider)->getJson("/api/v1/jobs/$job/conversation")->assertNotFound();
        $payload = ['body' => 'hello', 'commandId' => 'message-1'];
        $this->actingAs($provider)->postJson("/api/v1/jobs/$job/conversation/messages", $payload)->assertCreated()->assertJsonPath('data.sequence', 1);
        $this->postJson("/api/v1/jobs/$job/conversation/messages", $payload)->assertCreated()->assertJsonPath('data.sequence', 1);
        $this->actingAs($client)->getJson("/api/v1/jobs/$job/conversation")->assertOk()->assertJsonPath('data.messages.0.body', 'hello');
        $this->assertDatabaseMissing('conversation_messages', ['body_ciphertext' => 'hello']);
        $this->putJson("/api/v1/jobs/$job/conversation/read", ['sequence' => 1])->assertOk();
        $this->assertDatabaseCount('conversation_messages', 1);
        $this->assertDatabaseHas('conversation_reads', ['user_id' => $client->id, 'last_read_sequence' => 1]);
    }

    public function test_support_reads_require_a_reason_and_are_immutably_audited(): void
    {
        [$job] = $this->selectedJob();
        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin)->getJson("/api/v1/jobs/$job/conversation")->assertNotFound();
        $this->getJson("/api/v1/jobs/$job/conversation?accessReason=Investigating%20case%2042")->assertOk();
        $this->assertDatabaseHas('conversation_access_audits', ['staff_user_id' => $admin->id, 'reason' => 'Investigating case 42']);
    }

    public function test_blocking_stops_new_messages_without_exposing_history(): void
    {
        [$job,$client,$provider] = $this->selectedJob();
        DB::table('user_blocks')->insert(['blocker_user_id' => $client->id, 'blocked_user_id' => $provider->id, 'created_at' => now(), 'updated_at' => now()]);
        $this->actingAs($provider)->postJson("/api/v1/jobs/$job/conversation/messages", ['body' => 'x', 'commandId' => 'blocked'])->assertConflict();
    }

    public function test_foreground_travel_is_provider_owned_reconciles_and_stops(): void
    {
        [$job,$client,$provider,$outsider] = $this->selectedJob();
        $this->actingAs($client)->postJson("/api/v1/jobs/$job/travel/start", ['consentConfirmed' => true, 'foreground' => true])->assertNotFound();
        $this->actingAs($provider)->postJson("/api/v1/jobs/$job/travel/start", ['consentConfirmed' => true, 'foreground' => true])->assertOk()->assertJsonPath('data.status', 'active');
        $captured = now()->toIso8601String();
        $this->postJson("/api/v1/jobs/$job/travel/location", ['latitude' => 7.0707, 'longitude' => 125.6087, 'accuracyMeters' => 12, 'capturedAt' => $captured, 'foreground' => true])
            ->assertOk()
            ->assertJsonPath('data.arrivedAt', fn ($value) => $value !== null)
            ->assertJsonPath('data.distanceMeters', fn ($value) => is_int($value))
            ->assertJsonPath('data.etaSeconds', fn ($value) => is_int($value));
        $this->postJson("/api/v1/jobs/$job/travel/location", ['latitude' => 7.1, 'longitude' => 125.6, 'accuracyMeters' => 12, 'capturedAt' => $captured, 'foreground' => true])->assertConflict();
        $this->actingAs($outsider)->getJson("/api/v1/jobs/$job/travel")->assertNotFound();
        $this->actingAs($client)->getJson("/api/v1/jobs/$job/travel")->assertOk()->assertJsonPath('data.location.latitude', 7.0707);
        $this->actingAs($provider)->getJson('/api/v1/jobs')
            ->assertOk()
            ->assertJsonPath('data.0.travel.distanceMeters', fn ($value) => is_int($value))
            ->assertJsonPath('data.0.travel.etaSeconds', fn ($value) => is_int($value));
        $this->actingAs($provider)->postJson("/api/v1/jobs/$job/travel/stop")->assertOk()->assertJsonPath('data.status', 'stopped');
    }

    public function test_shop_service_travel_is_client_owned_and_routes_to_the_provider_shop(): void
    {
        [$job, $client, $provider] = $this->selectedJob('at_provider');

        $this->actingAs($provider)->postJson("/api/v1/jobs/$job/travel/start", ['consentConfirmed' => true, 'foreground' => true])->assertNotFound();
        $this->actingAs($client)->postJson("/api/v1/jobs/$job/travel/start", ['consentConfirmed' => true, 'foreground' => true])->assertOk();
        $this->getJson("/api/v1/jobs/$job/travel")
            ->assertOk()
            ->assertJsonPath('data.serviceLocationMode', 'at_provider')
            ->assertJsonPath('data.travelerRole', 'client')
            ->assertJsonPath('data.destinationLabel', 'Trusted Provider Shop')
            ->assertJsonPath('data.destination.latitude', 7.071);
    }

    private function selectedJob(string $serviceLocationMode = 'at_client'): array
    {
        $category = ServiceCategory::query()->create(['name' => 'Plumbing', 'slug' => 'plumbing', 'icon' => 'Wrench', 'is_active' => true]);
        $area = Area::query()->create(['type' => 'city', 'name' => 'Davao City', 'code' => 'DVO', 'is_active' => true]);
        $provider = $this->provider($category, $area);
        $outsider = $this->provider($category, $area);
        $client = User::factory()->create();
        $draft = ['title' => 'Fix leaking tap', 'description' => 'The kitchen tap has a steady leak near the handle.', 'categoryId' => $category->id, 'areaId' => $area->id, 'serviceLocationMode' => $serviceLocationMode, 'scheduleType' => 'asap', 'scheduledAt' => null, 'budgetMinCentavos' => 50000, 'budgetMaxCentavos' => 120000, 'latitude' => 7.0707, 'longitude' => 125.6087, 'addressLabel' => 'Near the hall'];
        $job = $this->actingAs($client)->withHeader('Idempotency-Key', 'phase5-job')->postJson('/api/v1/jobs', $draft)->json('data.id');
        $this->postJson("/api/v1/jobs/$job/post");
        $offer = $this->actingAs($provider)->postJson("/api/v1/jobs/$job/offers", ['amountCentavos' => 85000, 'availabilityText' => 'Today', 'estimatedDurationText' => 'Two hours', 'scope' => 'Labor and standard fittings included.', 'message' => 'Ready'])->json('data.revisions.0.id');
        $this->actingAs($client)->postJson("/api/v1/jobs/$job/select-offer", ['offerRevisionId' => $offer])->assertOk();

        return [$job, $client, $provider, $outsider];
    }

    private function provider(ServiceCategory $category, Area $area): User
    {
        $user = User::factory()->create();
        $profile = ProviderProfile::query()->create(['user_id' => $user->id, 'display_name' => 'Trusted Provider', 'bio' => 'Experienced provider for local household service work.', 'status' => 'active', 'offers_at_shop' => true, 'shop_name' => 'Trusted Provider Shop', 'shop_address' => 'Trusted Provider Shop', 'shop_latitude' => 7.071, 'shop_longitude' => 125.609]);
        $profile->services()->attach($category);
        $profile->serviceAreas()->attach($area);

        return $user;
    }
}
