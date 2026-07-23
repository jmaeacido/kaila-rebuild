<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\ServiceJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EndToEndMarketplaceLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_one_job_can_progress_from_posting_through_bilateral_rating(): void
    {
        $category = ServiceCategory::query()->create([
            'name' => 'Plumbing',
            'slug' => 'plumbing',
            'icon' => 'Wrench',
            'is_active' => true,
        ]);
        $area = Area::query()->create([
            'type' => 'city',
            'name' => 'Davao City',
            'code' => 'DVO',
            'is_active' => true,
        ]);
        $client = User::factory()->create();
        $provider = User::factory()->create();
        $profile = ProviderProfile::query()->create([
            'user_id' => $provider->id,
            'display_name' => 'Trusted Provider',
            'bio' => 'Experienced provider for local household service work.',
            'status' => 'active',
        ]);
        $profile->services()->attach($category);
        $profile->serviceAreas()->attach($area);

        $job = $this->actingAs($client)
            ->withHeader('Idempotency-Key', 'full-lifecycle-job')
            ->postJson('/api/v1/jobs', [
                'title' => 'Fix leaking kitchen tap',
                'description' => 'The kitchen tap has a steady leak near the handle.',
                'categoryId' => $category->id,
                'areaId' => $area->id,
                'scheduleType' => 'asap',
                'scheduledAt' => null,
                'budgetMinCentavos' => 50000,
                'budgetMaxCentavos' => 120000,
                'latitude' => 7.0707,
                'longitude' => 125.6087,
                'addressLabel' => 'Near the community hall',
            ])
            ->assertCreated()
            ->json('data.id');

        $this->assertDatabaseHas('service_jobs', ['id' => $job, 'status' => 'draft']);

        $this->postJson("/api/v1/jobs/$job/post")
            ->assertOk()
            ->assertJsonPath('data.status', 'posted');

        $this->actingAs($provider)
            ->getJson('/api/v1/opportunities')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.jobId', $job)
            ->assertJsonMissingPath('data.0.location')
            ->assertJsonMissingPath('data.0.clientUserId');

        $offer = $this->postJson("/api/v1/jobs/$job/offers", [
            'amountCentavos' => 85000,
            'availabilityText' => 'Today at 2 PM',
            'estimatedDurationText' => 'About two hours',
            'scope' => 'Labor, diagnosis, and standard fittings included.',
            'message' => 'I can help today.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.revisions.0.amountCentavos', 85000);

        $this->actingAs($client)
            ->getJson("/api/v1/jobs/$job/offers")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->postJson("/api/v1/jobs/$job/select-offer", [
            'offerRevisionId' => $offer->json('data.revisions.0.id'),
        ])
            ->assertOk()
            ->assertJsonPath('data.amountCentavos', 85000);

        $this->actingAs($provider)
            ->postJson("/api/v1/jobs/$job/conversation/messages", [
                'body' => 'I am preparing the standard fittings now.',
                'commandId' => 'full-lifecycle-message',
            ])
            ->assertCreated()
            ->assertJsonPath('data.sequence', 1);

        $this->actingAs($client)
            ->getJson("/api/v1/jobs/$job/conversation")
            ->assertOk()
            ->assertJsonPath('data.messages.0.body', 'I am preparing the standard fittings now.');

        $this->actingAs($provider)
            ->postJson("/api/v1/jobs/$job/travel/start", [
                'consentConfirmed' => true,
                'foreground' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->postJson("/api/v1/jobs/$job/travel/location", [
            'latitude' => 7.0707,
            'longitude' => 125.6087,
            'accuracyMeters' => 12,
            'capturedAt' => now()->toIso8601String(),
            'foreground' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.arrivedAt', fn ($value) => $value !== null);

        $this->postJson("/api/v1/jobs/$job/work/start")
            ->assertOk()
            ->assertJsonPath('data.status', 'working');

        $this->assertDatabaseHas('travel_sessions', [
            'service_job_id' => $job,
            'status' => 'stopped',
        ]);

        $this->postJson("/api/v1/jobs/$job/completion", [
            'summary' => 'The leaking seal was replaced and the fixture was pressure tested.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.cycle', 1);

        $this->actingAs($client)
            ->postJson("/api/v1/jobs/$job/completion/confirm")
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');

        $this->postJson("/api/v1/jobs/$job/reviews", [
            'rating' => 5,
            'comment' => 'Careful work and clear updates.',
        ])->assertCreated();

        $this->actingAs($provider)
            ->getJson("/api/v1/jobs/$job/reviews")
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->postJson("/api/v1/jobs/$job/reviews", [
            'rating' => 5,
            'comment' => 'The client communicated clearly.',
        ])->assertCreated();

        $this->actingAs($client)
            ->getJson("/api/v1/jobs/$job/reviews")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.publishedAt', fn ($value) => $value !== null)
            ->assertJsonPath('data.1.publishedAt', fn ($value) => $value !== null);

        $this->assertSame('rated_closed', ServiceJob::query()->findOrFail($job)->status);
        $this->assertDatabaseCount('accepted_offer_snapshots', 1);
        $this->assertDatabaseCount('job_reviews', 2);
        $this->assertDatabaseHas('reputation_projections', [
            'user_id' => $provider->id,
            'published_review_count' => 1,
        ]);
        $this->assertDatabaseHas('reputation_projections', [
            'user_id' => $client->id,
            'published_review_count' => 1,
        ]);
    }
}
