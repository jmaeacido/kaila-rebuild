<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhaseFourOffersTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_a_matched_provider_can_create_one_offer_and_client_is_notified(): void
    {
        [$jobId, $client, $provider] = $this->postedJob();
        $payload = $this->terms(85000);
        $offer = $this->actingAs($provider)->postJson("/api/v1/jobs/$jobId/offers", $payload)->assertCreated();
        $offer->assertJsonPath('data.revisions.0.amountCentavos', 85000)->assertJsonPath('data.revisions.0.proposedBy', 'provider');
        $this->assertDatabaseHas('service_jobs', ['id' => $jobId, 'status' => 'offers_received']);
        $this->assertDatabaseHas('durable_notifications', ['user_id' => $client->id, 'type' => 'offer.created']);
        $this->postJson("/api/v1/jobs/$jobId/offers", $payload)->assertCreated()->assertJsonPath('data.id', $offer->json('data.id'));
        $this->assertDatabaseCount('offer_threads', 1);
        $this->assertDatabaseCount('offer_revisions', 1);

        $outsider = User::factory()->create();
        ProviderProfile::query()->create(['user_id' => $outsider->id, 'display_name' => 'Outsider', 'bio' => str_repeat('x', 30), 'status' => 'active']);
        $this->actingAs($outsider)->postJson("/api/v1/jobs/$jobId/offers", $payload)->assertForbidden();
        $this->actingAs($client)->postJson("/api/v1/jobs/$jobId/offers", $payload)->assertNotFound();
    }

    public function test_revisions_are_append_only_and_competing_offers_are_private(): void
    {
        [$jobId, $client, $provider, $category, $area] = $this->postedJob();
        $thread = $this->actingAs($provider)->postJson("/api/v1/jobs/$jobId/offers", $this->terms(90000))->assertCreated()->json('data.id');
        $this->actingAs($client)->postJson("/api/v1/offers/$thread/revisions", $this->terms(80000))->assertCreated()->assertJsonCount(2, 'data.revisions');
        $this->assertDatabaseHas('offer_revisions', ['offer_thread_id' => $thread, 'revision_number' => 1, 'amount_centavos' => 90000]);
        $this->assertDatabaseHas('offer_revisions', ['offer_thread_id' => $thread, 'revision_number' => 2, 'amount_centavos' => 80000]);

        $second = $this->provider($category, $area);
        // A late profile never received an opportunity, so it cannot enter this negotiation.
        $this->actingAs(User::query()->findOrFail($second->user_id))->getJson("/api/v1/jobs/$jobId/offers")->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/v1/offers/$thread")->assertNotFound();
    }

    public function test_selection_is_exact_idempotent_and_closes_competitors_atomically(): void
    {
        [$jobId, $client, $first, $category, $area] = $this->postedJob(twoProviders: true);
        $second = User::query()->where('id', '!=', $client->id)->where('id', '!=', $first->id)->latest('id')->firstOrFail();
        $firstOffer = $this->actingAs($first)->postJson("/api/v1/jobs/$jobId/offers", $this->terms(90000))->assertCreated();
        $secondOffer = $this->actingAs($second)->postJson("/api/v1/jobs/$jobId/offers", $this->terms(70000))->assertCreated();
        $revisionId = $firstOffer->json('data.revisions.0.id');
        $selected = $this->actingAs($client)->postJson("/api/v1/jobs/$jobId/select-offer", ['offerRevisionId' => $revisionId])->assertOk();
        $selected->assertJsonPath('data.amountCentavos', 90000);
        $this->postJson("/api/v1/jobs/$jobId/select-offer", ['offerRevisionId' => $revisionId])->assertOk();
        $this->postJson("/api/v1/jobs/$jobId/select-offer", ['offerRevisionId' => $secondOffer->json('data.revisions.0.id')])->assertConflict();
        $this->assertDatabaseCount('accepted_offer_snapshots', 1);
        $this->assertDatabaseHas('offer_threads', ['id' => $firstOffer->json('data.id'), 'status' => 'accepted']);
        $this->assertDatabaseHas('offer_threads', ['id' => $secondOffer->json('data.id'), 'status' => 'rejected']);
        $this->assertDatabaseHas('service_jobs', ['id' => $jobId, 'status' => 'provider_selected']);
        $this->assertDatabaseHas('durable_notifications', ['user_id' => $first->id, 'type' => 'offer.selected']);
    }

    public function test_only_provider_withdraws_and_only_client_declines(): void
    {
        [$jobId, $client, $provider] = $this->postedJob();
        $thread = $this->actingAs($provider)->postJson("/api/v1/jobs/$jobId/offers", $this->terms(90000))->json('data.id');
        $this->actingAs($client)->postJson("/api/v1/offers/$thread/withdraw")->assertNotFound();
        $this->actingAs($provider)->postJson("/api/v1/offers/$thread/decline")->assertNotFound();
        $this->postJson("/api/v1/offers/$thread/withdraw")->assertOk()->assertJsonPath('data.status', 'withdrawn');
        $this->postJson("/api/v1/offers/$thread/revisions", $this->terms(80000))->assertConflict();
    }

    /** @return array{string, User, User, ServiceCategory, Area} */
    private function postedJob(bool $twoProviders = false): array
    {
        $category = ServiceCategory::query()->create(['name' => 'Plumbing', 'slug' => 'plumbing', 'icon' => 'Wrench', 'is_active' => true]);
        $area = Area::query()->create(['type' => 'city', 'name' => 'Davao City', 'code' => 'DVO', 'is_active' => true]);
        $provider = $this->provider($category, $area);
        if ($twoProviders) {
            $this->provider($category, $area);
        }
        $client = User::factory()->create();
        $draft = ['title' => 'Fix leaking tap', 'description' => 'The kitchen tap has a steady leak near the handle.', 'categoryId' => $category->id, 'areaId' => $area->id, 'scheduleType' => 'asap', 'scheduledAt' => null, 'budgetMinCentavos' => 50000, 'budgetMaxCentavos' => 120000, 'latitude' => 7.0707, 'longitude' => 125.6087, 'addressLabel' => 'Near the community hall'];
        $jobId = $this->actingAs($client)->withHeader('Idempotency-Key', uniqid('job-', true))->postJson('/api/v1/jobs', $draft)->assertCreated()->json('data.id');
        $this->postJson("/api/v1/jobs/$jobId/post")->assertOk();

        return [$jobId, $client, User::query()->findOrFail($provider->user_id), $category, $area];
    }

    private function provider(ServiceCategory $category, Area $area): ProviderProfile
    {
        $profile = ProviderProfile::query()->create(['user_id' => User::factory()->create()->id, 'display_name' => 'Trusted Provider', 'bio' => 'Experienced provider for local household service work.', 'status' => 'active', 'completed_jobs' => 12, 'rating' => 4.8, 'response_minutes' => 8]);
        $profile->services()->attach($category);
        $profile->serviceAreas()->attach($area);

        return $profile;
    }

    /** @return array<string, mixed> */
    private function terms(int $amount): array
    {
        return ['amountCentavos' => $amount, 'availabilityText' => 'Today at 2 PM', 'estimatedDurationText' => 'About two hours', 'scope' => 'Labor, diagnosis, and standard fittings included.', 'message' => 'I can help today.'];
    }
}
