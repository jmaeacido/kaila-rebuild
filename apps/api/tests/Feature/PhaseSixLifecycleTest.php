<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\DisputeCase;
use App\Models\JobReview;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\ServiceJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhaseSixLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_completion_revision_auto_confirmation_and_blind_reviews_are_authoritative(): void
    {
        [$id,$client,$provider] = $this->selectedJob();
        $this->actingAs($provider)->postJson("/api/v1/jobs/$id/work/start")->assertOk()->assertJsonPath('data.status', 'working');
        $submission = $this->postJson("/api/v1/jobs/$id/completion", ['summary' => 'All agreed repairs are finished and tested.'])->assertCreated()->json('data.id');
        $this->actingAs($client)->postJson("/api/v1/jobs/$id/completion/revision", ['reason' => 'The fixture still leaks during normal use.'])->assertOk()->assertJsonPath('data.status', 'revision_requested');
        $this->actingAs($provider)->postJson("/api/v1/jobs/$id/work/start")->assertOk();
        $this->postJson("/api/v1/jobs/$id/completion", ['summary' => 'The revised seal is installed and pressure tested.'])->assertCreated();
        $job = ServiceJob::query()->findOrFail($id);
        $job->update(['auto_confirm_at' => now()->subSecond()]);
        $this->artisan('phase-six:deadlines')->assertSuccessful();
        $this->assertDatabaseHas('service_jobs', ['id' => $id, 'status' => 'completed']);
        $this->actingAs($client)->postJson("/api/v1/jobs/$id/reviews", ['rating' => 5, 'comment' => 'Careful work'])->assertCreated();
        $this->actingAs($provider)->getJson("/api/v1/jobs/$id/reviews")->assertOk()->assertJsonCount(0, 'data');
        $this->postJson("/api/v1/jobs/$id/reviews", ['rating' => 4, 'comment' => 'Clear client'])->assertCreated();
        $this->assertDatabaseHas('service_jobs', ['id' => $id, 'status' => 'rated_closed']);
        $this->assertDatabaseHas('job_reviews', ['id' => JobReview::query()->firstOrFail()->id, 'published_at' => JobReview::query()->firstOrFail()->published_at]);
        $this->assertDatabaseHas('reputation_projections', ['published_review_count' => 1]);
    }

    public function test_dispute_requires_structured_audited_support_decision_and_different_appeal_reviewer(): void
    {
        [$id,$client,$provider] = $this->selectedJob();
        $this->actingAs($provider)->postJson("/api/v1/jobs/$id/work/start");
        $caseId = $this->actingAs($client)->postJson("/api/v1/jobs/$id/disputes", ['reason' => 'The delivered scope does not match the accepted offer.'])->assertCreated()->json('data.id');
        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin)->getJson("/api/v1/admin/marketplace/cases/$caseId?accessReason=Reviewing%20submitted%20scope%20evidence")->assertOk();
        $this->postJson("/api/v1/admin/marketplace/cases/$caseId/decision", ['targetState' => 'revision_requested', 'reason' => 'The provider must correct the documented scope.'])->assertOk()->assertJsonPath('data.jobStatus', 'revision_requested');
        $this->actingAs($client)->postJson("/api/v1/disputes/$caseId/appeal", ['reason' => 'New dated evidence changes the requested remedy.'])->assertOk();
        $this->actingAs($admin)->postJson("/api/v1/admin/marketplace/cases/$caseId/decision", ['targetState' => 'cancelled', 'reason' => 'Attempting the appeal with the same reviewer.'])->assertConflict();
        $other = User::factory()->create(['is_admin' => true]);
        $this->actingAs($other)->postJson("/api/v1/admin/marketplace/cases/$caseId/decision", ['targetState' => 'cancelled', 'reason' => 'The new evidence supports ending the engagement.'])->assertOk();
        $this->assertDatabaseHas('dispute_access_audits', ['staff_user_id' => $admin->id]);
        $this->assertSame(4, DisputeCase::query()->findOrFail($caseId)->actions()->count());
    }

    public function test_terminal_transition_stops_active_travel_and_mutual_cancellation_is_required(): void
    {
        [$id,$client,$provider] = $this->selectedJob();
        $this->actingAs($provider)->postJson("/api/v1/jobs/$id/travel/start", ['consentConfirmed' => true, 'foreground' => true])->assertOk();
        $this->actingAs($client)->postJson("/api/v1/jobs/$id/cancel", ['reason' => 'I can no longer provide access at the agreed time.'])->assertStatus(202);
        $this->actingAs($provider)->postJson("/api/v1/jobs/$id/cancel", ['reason' => 'I agree that this booking should be cancelled.'])->assertOk();
        $this->assertDatabaseHas('service_jobs', ['id' => $id, 'status' => 'cancelled']);
        $this->assertDatabaseHas('travel_sessions', ['service_job_id' => $id, 'status' => 'stopped']);
    }

    private function selectedJob(): array
    {
        $category = ServiceCategory::query()->create(['name' => 'Plumbing', 'slug' => 'plumbing', 'icon' => 'Wrench', 'is_active' => true]);
        $area = Area::query()->create(['type' => 'city', 'name' => 'Davao City', 'code' => 'DVO', 'is_active' => true]);
        $provider = User::factory()->create();
        $profile = ProviderProfile::query()->create(['user_id' => $provider->id, 'display_name' => 'Trusted Provider', 'bio' => 'Experienced provider for household service work.', 'status' => 'active']);
        $profile->services()->attach($category);
        $profile->serviceAreas()->attach($area);
        $client = User::factory()->create();
        $draft = ['title' => 'Fix leaking tap', 'description' => 'The kitchen tap has a steady leak near the handle.', 'categoryId' => $category->id, 'areaId' => $area->id, 'scheduleType' => 'asap', 'scheduledAt' => null, 'budgetMinCentavos' => 50000, 'budgetMaxCentavos' => 120000, 'latitude' => 7.0707, 'longitude' => 125.6087, 'addressLabel' => 'Near the hall'];
        $id = $this->actingAs($client)->withHeader('Idempotency-Key', 'phase6-job-'.str()->uuid())->postJson('/api/v1/jobs', $draft)->json('data.id');
        $this->postJson("/api/v1/jobs/$id/post");
        $offer = $this->actingAs($provider)->postJson("/api/v1/jobs/$id/offers", ['amountCentavos' => 85000, 'availabilityText' => 'Today', 'estimatedDurationText' => 'Two hours', 'scope' => 'Labor and standard fittings included.', 'message' => 'Ready'])->json('data.revisions.0.id');
        $this->actingAs($client)->postJson("/api/v1/jobs/$id/select-offer", ['offerRevisionId' => $offer]);

        return [$id, $client, $provider];
    }
}
