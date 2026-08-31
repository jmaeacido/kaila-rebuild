<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\JobOpportunity;
use App\Models\OutboxEvent;
use App\Models\OfferThread;
use App\Models\ProfileAsset;
use App\Models\ProviderCredential;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\ServiceJob;
use App\Models\User;
use App\Notifications\BrandedProviderProfileDecision;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MarketplaceProfilesTest extends TestCase
{
    use RefreshDatabase;

    public function test_current_user_can_see_their_unified_published_reputation(): void
    {
        $user = User::factory()->create();
        DB::table('reputation_projections')->insert([
            'user_id' => $user->id,
            'published_review_count' => 3,
            'rating_sum' => 14,
            'average_rating' => 4.67,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.reputation.averageRating', 4.67)
            ->assertJsonPath('data.reputation.reviewCount', 3);
    }

    public function test_provider_can_create_a_valid_profile_and_switch_mode_without_gaining_admin_authority(): void
    {
        [$category, $area] = $this->referenceData();
        $user = User::factory()->create();
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($user)->putJson('/api/v1/me/active-mode', ['activeMode' => 'provider'])
            ->assertOk()->assertJsonPath('data.activeMode', 'provider');

        $this->submitProviderProfile($user, $this->validProfile($category, $area))
            ->assertOk()->assertJsonPath('data.status', 'pending_review');

        $this->getJson('/api/v1/admin/marketplace/review-queue')->assertForbidden();
        $this->assertDatabaseHas('provider_services', ['service_category_id' => $category->id]);
        $this->assertDatabaseHas('provider_service_areas', ['area_id' => $area->id]);
        $this->assertDatabaseHas('durable_notifications', [
            'user_id' => $admin->id,
            'type' => 'admin.review.provider_submitted',
            'resource_type' => 'provider_profile',
        ]);
    }

    public function test_provider_can_offer_multiple_services(): void
    {
        [$category, $area] = $this->referenceData();
        $computerServices = ServiceCategory::query()->create([
            'name' => 'Computer & IT Services',
            'slug' => 'computer-it-services',
            'icon' => 'MonitorCog',
            'is_active' => true,
        ]);
        $user = User::factory()->create();
        User::factory()->create(['is_admin' => true]);
        $profile = $this->validProfile($category, $area);
        $profile['serviceIds'] = [$category->id, $computerServices->id];

        $this->submitProviderProfile($user, $profile)
            ->assertOk()
            ->assertJsonCount(2, 'data.services')
            ->assertJsonFragment(['id' => $category->id, 'name' => 'Plumbing'])
            ->assertJsonFragment(['id' => $computerServices->id, 'name' => 'Computer & IT Services']);

        $this->assertDatabaseHas('provider_services', [
            'provider_profile_id' => ProviderProfile::query()->where('user_id', $user->id)->value('id'),
            'service_category_id' => $category->id,
        ]);
        $this->assertDatabaseHas('provider_services', [
            'provider_profile_id' => ProviderProfile::query()->where('user_id', $user->id)->value('id'),
            'service_category_id' => $computerServices->id,
        ]);
    }

    public function test_provider_can_cover_a_whole_municipality(): void
    {
        $category = ServiceCategory::query()->create([
            'name' => 'Plumbing',
            'slug' => 'plumbing',
            'icon' => 'Wrench',
            'is_active' => true,
        ]);
        $province = Area::query()->create([
            'type' => 'province',
            'name' => 'Agusan del Norte',
            'code' => '1600200000',
            'is_active' => true,
        ]);
        $municipality = Area::query()->create([
            'parent_id' => $province->id,
            'type' => 'municipality',
            'name' => 'Nasipit',
            'code' => '1600209000',
            'is_active' => true,
        ]);
        $user = User::factory()->create();
        User::factory()->create(['is_admin' => true]);

        $this->submitProviderProfile($user, $this->validProfile($category, $municipality))
            ->assertOk()
            ->assertJsonPath('data.status', 'pending_review')
            ->assertJsonPath('data.service_areas.0.id', $municipality->id)
            ->assertJsonPath('data.service_areas.0.type', 'municipality');

        $this->assertDatabaseHas('provider_service_areas', ['area_id' => $municipality->id]);
    }

    public function test_discovery_is_deterministic_and_excludes_ineligible_or_out_of_area_profiles(): void
    {
        [$category, $area] = $this->referenceData();
        $otherArea = Area::query()->create(['type' => 'city', 'name' => 'Cebu City', 'code' => 'CEB', 'is_active' => true]);
        $eligible = $this->provider('Eligible Provider', 'active', $category, $area);
        DB::table('reputation_projections')->insert([
            'user_id' => $eligible->user_id,
            'published_review_count' => 2,
            'rating_sum' => 9,
            'average_rating' => 4.5,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->provider('Still Reviewing', 'pending_review', $category, $area);
        $this->provider('Wrong Area', 'active', $category, $otherArea);

        $this->actingAs(User::factory()->create())
            ->getJson("/api/v1/providers?categoryId={$category->id}&areaId={$area->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $eligible->id)
            ->assertJsonPath('data.0.rating', 4.5)
            ->assertJsonPath('data.0.reviewCount', 2)
            ->assertJsonPath('data.0.verified', false);
    }

    public function test_city_wide_provider_is_discoverable_from_a_child_barangay(): void
    {
        [$category, $city] = $this->referenceData();
        $barangay = Area::query()->create(['parent_id' => $city->id, 'type' => 'barangay', 'name' => 'Barangay One', 'code' => 'DVO-001', 'is_active' => true]);
        $provider = $this->provider('City-wide Provider', 'active', $category, $city);

        $this->actingAs(User::factory()->create())
            ->getJson("/api/v1/providers?categoryId={$category->id}&areaId={$barangay->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $provider->id);
    }

    public function test_updating_an_active_provider_returns_it_to_the_admin_review_queue(): void
    {
        [$category, $city] = $this->referenceData();
        $provider = $this->provider('City-wide Provider', 'active', $category, $city);
        $user = User::query()->findOrFail($provider->user_id);

        $payload = $this->validProfile($category, $city);
        $payload['displayName'] = 'Updated Provider Name';
        $payload['bio'] = 'Updated bio with enough detail for marketplace review workflows.';
        $payload['yearsExperience'] = 8;
        $this->submitProviderProfile($user, $payload)
            ->assertOk()
            ->assertJsonPath('data.status', 'pending_review');

        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin)
            ->getJson('/api/v1/admin/marketplace/review-queue')
            ->assertOk()
            ->assertJsonPath('data.providers.0.id', $provider->id)
            ->assertJsonPath('data.providers.0.isUpdate', true)
            ->assertJsonFragment(['field' => 'displayName', 'label' => 'Display name', 'previous' => 'City-wide Provider', 'current' => 'Updated Provider Name'])
            ->assertJsonFragment(['field' => 'yearsExperience', 'label' => 'Experience', 'previous' => '4 years', 'current' => '8 years']);
    }

    public function test_first_provider_submission_does_not_mark_review_as_an_update(): void
    {
        [$category, $area] = $this->referenceData();
        $user = User::factory()->create();

        $this->submitProviderProfile($user, $this->validProfile($category, $area))
            ->assertOk()
            ->assertJsonPath('data.status', 'pending_review');

        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin)
            ->getJson('/api/v1/admin/marketplace/review-queue')
            ->assertOk()
            ->assertJsonPath('data.providers.0.isUpdate', false)
            ->assertJsonPath('data.providers.0.changes', []);
    }

    public function test_provider_profile_submission_requires_a_profile_picture(): void
    {
        [$category, $area] = $this->referenceData();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/v1/me/provider-profile', $this->validProfile($category, $area))
            ->assertStatus(422)
            ->assertJsonPath('message', 'Upload a profile picture before submitting your provider profile.');
    }

    public function test_approving_a_provider_requires_an_approved_profile_picture(): void
    {
        [$category, $area] = $this->referenceData();
        $user = User::factory()->create();
        $admin = User::factory()->create(['is_admin' => true]);
        $this->seedAvatar($user, 'pending');
        $this->submitProviderProfile($user, $this->validProfile($category, $area))->assertOk();
        $profile = ProviderProfile::query()->where('user_id', $user->id)->firstOrFail();

        $this->actingAs($admin)
            ->putJson("/api/v1/admin/marketplace/providers/{$profile->id}/status", ['status' => 'active'])
            ->assertStatus(409)
            ->assertJsonPath('message', 'Approve the provider profile picture before activating this profile.');
    }

    public function test_approving_a_provider_creates_an_official_welcome_community_post_with_avatar(): void
    {
        [$category, $area] = $this->referenceData();
        $user = User::factory()->create(['name' => 'Ana Repairs']);
        $admin = User::factory()->create(['is_admin' => true]);
        $this->seedAvatar($user, 'clean');
        $this->submitProviderProfile($user, $this->validProfile($category, $area))->assertOk();
        $profile = ProviderProfile::query()->where('user_id', $user->id)->firstOrFail();

        $this->actingAs($admin)
            ->putJson("/api/v1/admin/marketplace/providers/{$profile->id}/status", ['status' => 'active'])
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $profile->refresh();
        $this->assertNotNull($profile->welcome_community_post_id);
        $this->assertDatabaseHas('community_posts', [
            'id' => $profile->welcome_community_post_id,
            'kind' => 'official_update',
            'author_display_mode' => 'official',
            'moderation_status' => 'published',
        ]);
        $this->assertDatabaseHas('community_post_media', [
            'community_post_id' => $profile->welcome_community_post_id,
        ]);
        $this->assertDatabaseHas('outbox_events', [
            'resource_id' => $profile->welcome_community_post_id,
            'event_type' => 'community.post.published',
        ]);
    }

    public function test_approving_a_provider_profile_notifies_the_provider(): void
    {
        Notification::fake();
        [$category, $area] = $this->referenceData();
        $profile = $this->provider('Approved Provider', 'pending_review', $category, $area);
        $user = User::query()->findOrFail($profile->user_id);
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->putJson("/api/v1/admin/marketplace/providers/{$profile->id}/status", ['status' => 'active'])
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('durable_notifications', [
            'user_id' => $user->id,
            'type' => 'profile.provider_approved',
            'title' => 'Provider profile approved',
        ]);
        $this->assertDatabaseHas('outbox_events', ['event_type' => 'notification.created']);
        $this->assertDatabaseHas('outbox_events', [
            'event_type' => 'profile.updated',
            'resource_type' => 'provider_profile',
            'resource_id' => (string) $profile->id,
        ]);
        $profileEvent = OutboxEvent::query()
            ->where('event_type', 'profile.updated')
            ->where('resource_id', (string) $profile->id)
            ->latest('occurred_at')
            ->firstOrFail();
        $this->assertContains((string) $admin->id, $profileEvent->payload['recipientUserIds']);
        $this->assertContains((string) $user->id, $profileEvent->payload['recipientUserIds']);
        Notification::assertSentTo(
            $user,
            BrandedProviderProfileDecision::class,
            fn (BrandedProviderProfileDecision $notification): bool => $notification->toMail($user)->subject === 'Your KAILA provider profile is approved',
        );
    }

    public function test_approving_profile_changes_matches_existing_jobs_for_every_selected_service(): void
    {
        Notification::fake();
        [$plumbing, $area] = $this->referenceData();
        $computerServices = ServiceCategory::query()->create([
            'name' => 'Computer & IT Services',
            'slug' => 'computer-it-services',
            'icon' => 'MonitorCog',
            'is_active' => true,
        ]);
        $profile = $this->provider('Multi-service Provider', 'pending_review', $plumbing, $area);
        $profile->services()->attach($computerServices);
        $client = User::factory()->create();
        $admin = User::factory()->create(['is_admin' => true]);

        foreach ([$plumbing, $computerServices] as $category) {
            ServiceJob::query()->create([
                'client_user_id' => $client->id,
                'service_category_id' => $category->id,
                'area_id' => $area->id,
                'status' => 'posted',
                'title' => "Job for {$category->name}",
                'description' => 'Existing job awaiting a qualified local provider.',
                'schedule_type' => 'asap',
                'posted_at' => now(),
            ]);
        }

        $this->actingAs($admin)
            ->putJson("/api/v1/admin/marketplace/providers/{$profile->id}/status", ['status' => 'active'])
            ->assertOk();

        $this->assertDatabaseCount('job_opportunities', 2);
        $this->assertSame(2, DB::table('durable_notifications')
            ->where('user_id', $profile->user_id)
            ->where('type', 'opportunity.matched')
            ->count());
        $this->assertSame(2, DB::table('outbox_events')
            ->where('event_type', 'opportunity.matched')
            ->count());
    }

    public function test_approving_a_service_area_change_removes_unoffered_old_area_matches(): void
    {
        Notification::fake();
        [$category, $oldArea] = $this->referenceData();
        $newArea = Area::query()->create([
            'type' => 'city',
            'name' => 'Tagum City',
            'code' => 'TAG',
            'is_active' => true,
        ]);
        $profile = $this->provider('Relocating Provider', 'active', $category, $oldArea);
        $client = User::factory()->create();
        $admin = User::factory()->create(['is_admin' => true]);
        $oldJob = ServiceJob::query()->create([
            'client_user_id' => $client->id,
            'service_category_id' => $category->id,
            'area_id' => $oldArea->id,
            'status' => 'posted',
            'title' => 'Old area job',
            'description' => 'This job is outside the provider new service area.',
            'schedule_type' => 'asap',
            'posted_at' => now(),
        ]);
        $newJob = ServiceJob::query()->create([
            'client_user_id' => $client->id,
            'service_category_id' => $category->id,
            'area_id' => $newArea->id,
            'status' => 'posted',
            'title' => 'New area job',
            'description' => 'This job is inside the provider new service area.',
            'schedule_type' => 'asap',
            'posted_at' => now(),
        ]);
        $offeredOldJob = ServiceJob::query()->create([
            'client_user_id' => $client->id,
            'service_category_id' => $category->id,
            'area_id' => $oldArea->id,
            'status' => 'offers_received',
            'title' => 'Old area job with an offer',
            'description' => 'An existing negotiation must survive a coverage change.',
            'schedule_type' => 'asap',
            'posted_at' => now(),
        ]);
        $profile->serviceAreas()->sync([$newArea->id]);
        $profile->update(['status' => 'pending_review']);
        JobOpportunity::query()->create([
            'service_job_id' => $oldJob->id,
            'provider_profile_id' => $profile->id,
        ]);
        JobOpportunity::query()->create([
            'service_job_id' => $offeredOldJob->id,
            'provider_profile_id' => $profile->id,
            'state' => 'offered',
        ]);
        OfferThread::query()->create([
            'service_job_id' => $offeredOldJob->id,
            'provider_profile_id' => $profile->id,
        ]);

        $this->actingAs($admin)
            ->putJson("/api/v1/admin/marketplace/providers/{$profile->id}/status", ['status' => 'active'])
            ->assertOk();

        $this->assertDatabaseMissing('job_opportunities', [
            'service_job_id' => $oldJob->id,
            'provider_profile_id' => $profile->id,
        ]);
        $this->assertDatabaseHas('job_opportunities', [
            'service_job_id' => $newJob->id,
            'provider_profile_id' => $profile->id,
        ]);
        $this->assertDatabaseHas('job_opportunities', [
            'service_job_id' => $offeredOldJob->id,
            'provider_profile_id' => $profile->id,
            'state' => 'offered',
        ]);
        $this->assertDatabaseMissing('durable_notifications', [
            'user_id' => $profile->user_id,
            'type' => 'opportunity.matched',
            'resource_id' => $oldJob->id,
        ]);
        $this->assertDatabaseHas('durable_notifications', [
            'user_id' => $profile->user_id,
            'type' => 'opportunity.matched',
            'resource_id' => $newJob->id,
        ]);
    }

    public function test_verified_badge_appears_only_after_clean_asset_and_approved_credential(): void
    {
        [$category, $area] = $this->referenceData();
        $profile = $this->provider('Verified Provider', 'active', $category, $area);
        $asset = ProfileAsset::query()->create(['user_id' => $profile->user_id, 'purpose' => 'credential', 'disk' => 'private-assets', 'object_key' => 'private/credential.jpg',
            'original_name' => 'credential.jpg', 'mime_type' => 'image/jpeg', 'size_bytes' => 100, 'scan_status' => 'clean']);
        $credential = ProviderCredential::query()->create(['provider_profile_id' => $profile->id, 'asset_id' => $asset->id, 'type' => 'identity', 'label' => 'Government ID', 'review_status' => 'pending']);

        $viewer = User::factory()->create();
        $this->actingAs($viewer)->getJson("/api/v1/providers/{$profile->id}")->assertJsonPath('data.verified', false);
        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin)->putJson("/api/v1/admin/marketplace/credentials/{$credential->id}/review", ['reviewStatus' => 'approved'])
            ->assertOk();
        $this->actingAs($viewer)->getJson("/api/v1/providers/{$profile->id}")->assertJsonPath('data.verified', true);
    }

    public function test_provider_and_credential_rejections_require_reasons_notify_users_and_enter_history(): void
    {
        Notification::fake();
        [$category, $area] = $this->referenceData();
        $profile = $this->provider('Review Provider', 'pending_review', $category, $area);
        $user = User::query()->findOrFail($profile->user_id);
        $asset = ProfileAsset::query()->create([
            'user_id' => $user->id,
            'purpose' => 'credential',
            'disk' => 'private-local',
            'object_key' => 'credentials/license.pdf',
            'original_name' => 'license.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 100,
            'scan_status' => 'clean',
        ]);
        $credential = ProviderCredential::query()->create([
            'provider_profile_id' => $profile->id,
            'asset_id' => $asset->id,
            'type' => 'license',
            'label' => 'Trade License',
            'review_status' => 'pending',
        ]);
        $admin = User::factory()->create(['is_admin' => true, 'name' => 'Review Admin']);

        $this->actingAs($admin)
            ->putJson("/api/v1/admin/marketplace/providers/{$profile->id}/status", ['status' => 'rejected'])
            ->assertUnprocessable();
        $this->putJson("/api/v1/admin/marketplace/providers/{$profile->id}/status", [
            'status' => 'rejected',
            'reviewReason' => 'Add a clearer description of your professional experience.',
        ])->assertOk();
        $this->putJson("/api/v1/admin/marketplace/credentials/{$credential->id}/review", [
            'reviewStatus' => 'rejected',
        ])->assertUnprocessable();
        $this->putJson("/api/v1/admin/marketplace/credentials/{$credential->id}/review", [
            'reviewStatus' => 'rejected',
            'reviewNote' => 'The license number is cropped out of the document.',
        ])->assertOk();

        $this->assertDatabaseHas('provider_profiles', ['id' => $profile->id, 'reviewed_by' => $admin->id, 'review_note' => 'Add a clearer description of your professional experience.']);
        $this->assertDatabaseHas('provider_credentials', ['id' => $credential->id, 'reviewed_by' => $admin->id, 'review_note' => 'The license number is cropped out of the document.']);
        $this->assertDatabaseHas('durable_notifications', ['user_id' => $user->id, 'type' => 'profile.provider_rejected']);
        $this->assertDatabaseHas('durable_notifications', ['user_id' => $user->id, 'type' => 'profile.credential_rejected']);
        Notification::assertSentTo(
            $user,
            BrandedProviderProfileDecision::class,
            fn (BrandedProviderProfileDecision $notification): bool => str_contains(
                $notification->toMail($user)->render(),
                'Add a clearer description of your professional experience.',
            ),
        );

        $this->getJson('/api/v1/admin/marketplace/review-queue')
            ->assertOk()
            ->assertJsonPath('data.providerReviews.0.reviewedBy.name', 'Review Admin')
            ->assertJsonPath('data.providerReviews.0.reviewReason', 'Add a clearer description of your professional experience.')
            ->assertJsonPath('data.credentialReviews.0.reviewedBy.name', 'Review Admin')
            ->assertJsonPath('data.credentialReviews.0.reviewReason', 'The license number is cropped out of the document.');
    }

    public function test_uploads_are_private_and_quarantined_until_scan(): void
    {
        $disk = (string) config('filesystems.private_assets_disk');
        Storage::fake($disk);
        $user = User::factory()->create();
        $admin = User::factory()->create(['is_admin' => true]);
        $response = $this->actingAs($user)->postJson('/api/v1/me/profile-assets', [
            'purpose' => 'portfolio', 'file' => UploadedFile::fake()->image('repair.jpg', 800, 600), 'caption' => 'Completed repair',
        ])->assertCreated()->assertJsonPath('data.scan_status', 'pending');

        $asset = ProfileAsset::query()->findOrFail($response->json('data.id'));
        $this->assertDatabaseHas('durable_notifications', [
            'user_id' => $admin->id,
            'type' => 'admin.review.asset_submitted',
            'resource_id' => $asset->id,
        ]);
        Storage::disk($disk)->assertExists($asset->object_key);
        $this->actingAs(User::factory()->create())
            ->getJson("/api/v1/profile-assets/{$asset->id}")
            ->assertForbidden();
        $this->actingAs($user)
            ->get("/api/v1/profile-assets/{$asset->id}")
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg');
        $asset->update(['scan_status' => 'clean']);
        $this->get("/api/v1/profile-assets/{$asset->id}")
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_admin_review_queue_includes_asset_context_and_private_preview(): void
    {
        $disk = (string) config('filesystems.private_assets_disk');
        Storage::fake($disk);
        $uploader = User::factory()->create([
            'name' => 'Profile Uploader',
            'email' => 'uploader@example.com',
        ]);
        $admin = User::factory()->create(['is_admin' => true]);
        $asset = ProfileAsset::query()->create([
            'user_id' => $uploader->id,
            'purpose' => 'avatar',
            'disk' => $disk,
            'object_key' => 'profiles/review/profile.png',
            'original_name' => 'profile.png',
            'mime_type' => 'image/png',
            'size_bytes' => 8,
            'scan_status' => 'pending',
        ]);
        Storage::disk($disk)->put($asset->object_key, 'png-data');

        $this->actingAs($admin)
            ->getJson('/api/v1/admin/marketplace/review-queue')
            ->assertOk()
            ->assertJsonPath('data.assets.0.id', $asset->id)
            ->assertJsonPath('data.assets.0.purpose', 'avatar')
            ->assertJsonPath('data.assets.0.uploadedBy.name', 'Profile Uploader')
            ->assertJsonPath('data.assets.0.uploadedBy.email', 'uploader@example.com')
            ->assertJsonPath('data.assets.0.previewUrl', "/api/v1/admin/marketplace/assets/{$asset->id}/preview");

        $this->actingAs($uploader)
            ->get("/api/v1/admin/marketplace/assets/{$asset->id}/preview")
            ->assertForbidden();
        $this->actingAs($admin)
            ->get("/api/v1/admin/marketplace/assets/{$asset->id}/preview")
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertHeader('Cache-Control', 'max-age=0, no-store, private')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_png_avatar_upload_is_accepted(): void
    {
        $disk = (string) config('filesystems.private_assets_disk');
        Storage::fake($disk);
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/api/v1/me/profile-assets', [
            'purpose' => 'avatar',
            'file' => UploadedFile::fake()->image('profile.png', 512, 512),
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('data.purpose', 'avatar')
            ->assertJsonPath('data.original_name', 'profile.png');

        $asset = ProfileAsset::query()->findOrFail($response->json('data.id'));
        $this->assertSame('image/png', $asset->mime_type);
        Storage::disk($disk)->assertExists($asset->object_key);
    }

    public function test_user_is_notified_when_profile_files_are_approved_or_rejected(): void
    {
        $user = User::factory()->create();
        $admin = User::factory()->create(['is_admin' => true]);
        $approved = ProfileAsset::query()->create([
            'user_id' => $user->id,
            'purpose' => 'avatar',
            'disk' => 'private-local',
            'object_key' => 'profiles/approved.png',
            'original_name' => 'approved.png',
            'mime_type' => 'image/png',
            'size_bytes' => 100,
            'scan_status' => 'pending',
        ]);
        $rejected = ProfileAsset::query()->create([
            'user_id' => $user->id,
            'purpose' => 'portfolio',
            'disk' => 'private-local',
            'object_key' => 'profiles/rejected.png',
            'original_name' => 'rejected.png',
            'mime_type' => 'image/png',
            'size_bytes' => 100,
            'scan_status' => 'pending',
        ]);

        $this->actingAs($admin)
            ->putJson("/api/v1/admin/marketplace/assets/{$approved->id}/scan", ['scanStatus' => 'clean'])
            ->assertOk();
        $this->putJson("/api/v1/admin/marketplace/assets/{$rejected->id}/scan", ['scanStatus' => 'rejected'])
            ->assertUnprocessable();
        $this->putJson("/api/v1/admin/marketplace/assets/{$rejected->id}/scan", [
            'scanStatus' => 'rejected',
            'reviewReason' => 'The image is too blurry to identify the subject.',
        ])
            ->assertOk();

        $this->assertDatabaseHas('durable_notifications', [
            'user_id' => $user->id,
            'type' => 'profile.file_approved',
            'resource_type' => 'profile_asset',
            'resource_id' => $approved->id,
            'title' => 'Profile picture approved',
        ]);
        $this->assertDatabaseHas('durable_notifications', [
            'user_id' => $user->id,
            'type' => 'profile.file_rejected',
            'resource_type' => 'profile_asset',
            'resource_id' => $rejected->id,
            'title' => 'Portfolio image not approved',
            'body' => "Your portfolio image wasn't approved. Reason: The image is too blurry to identify the subject.",
        ]);
        $this->assertDatabaseHas('profile_assets', [
            'id' => $rejected->id,
            'reviewed_by' => $admin->id,
            'review_note' => 'The image is too blurry to identify the subject.',
        ]);
        $this->assertDatabaseCount('durable_notifications', 2);
        $this->assertDatabaseHas('outbox_events', ['event_type' => 'notification.created']);

        $this->getJson('/api/v1/admin/marketplace/review-queue')
            ->assertOk()
            ->assertJsonCount(2, 'data.assetReviews')
            ->assertJsonFragment([
                'id' => $approved->id,
                'decision' => 'approved',
                'reviewReason' => null,
            ])
            ->assertJsonFragment([
                'id' => $rejected->id,
                'decision' => 'rejected',
                'reviewReason' => 'The image is too blurry to identify the subject.',
            ]);
    }

    public function test_public_profile_exposes_only_clean_portfolio_metadata(): void
    {
        [$category, $area] = $this->referenceData();
        $profile = $this->provider('Portfolio Provider', 'active', $category, $area);
        ProfileAsset::query()->create(['user_id' => $profile->user_id, 'purpose' => 'portfolio', 'disk' => 'private-assets', 'object_key' => 'portfolio/clean.jpg', 'original_name' => 'clean.jpg', 'mime_type' => 'image/jpeg', 'size_bytes' => 100, 'scan_status' => 'clean', 'caption' => 'Finished repair']);
        ProfileAsset::query()->create(['user_id' => $profile->user_id, 'purpose' => 'portfolio', 'disk' => 'private-assets', 'object_key' => 'portfolio/pending.jpg', 'original_name' => 'pending.jpg', 'mime_type' => 'image/jpeg', 'size_bytes' => 100, 'scan_status' => 'pending', 'caption' => 'Not reviewed']);

        $this->actingAs(User::factory()->create())
            ->getJson("/api/v1/providers/{$profile->id}")->assertOk()->assertJsonCount(1, 'data.portfolio')
            ->assertJsonPath('data.portfolio.0.caption', 'Finished repair')->assertJsonMissingPath('data.portfolio.0.object_key');
    }

    public function test_marketplace_profile_lists_owned_portfolio_assets(): void
    {
        $user = User::factory()->create();
        ProfileAsset::query()->create([
            'user_id' => $user->id,
            'purpose' => 'portfolio',
            'disk' => 'private-local',
            'object_key' => 'profiles/pending.jpg',
            'original_name' => 'pending.jpg',
            'mime_type' => 'image/jpeg',
            'size_bytes' => 100,
            'scan_status' => 'pending',
            'caption' => 'Kitchen repaint',
            'sort_order' => 1,
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/me/marketplace-profile')
            ->assertOk()
            ->assertJsonPath('data.providerPortfolio.0.caption', 'Kitchen repaint')
            ->assertJsonPath('data.providerPortfolio.0.scanStatus', 'pending')
            ->assertJsonStructure(['data' => ['providerPortfolio' => [['downloadPath']]]]);
    }

    public function test_clients_can_like_and_unlike_portfolio_photos(): void
    {
        [$category, $area] = $this->referenceData();
        $profile = $this->provider('Portfolio Likes Provider', 'active', $category, $area);
        $client = User::factory()->create();
        $asset = ProfileAsset::query()->create([
            'user_id' => $profile->user_id,
            'purpose' => 'portfolio',
            'disk' => 'private-local',
            'object_key' => 'profiles/clean.jpg',
            'original_name' => 'clean.jpg',
            'mime_type' => 'image/jpeg',
            'size_bytes' => 100,
            'scan_status' => 'clean',
            'caption' => 'Finished repair',
        ]);

        $this->actingAs($client)
            ->putJson("/api/v1/profile-assets/{$asset->id}/like")
            ->assertOk()
            ->assertJsonPath('data.liked', true)
            ->assertJsonPath('data.likeCount', 1);

        $this->actingAs($client)
            ->getJson("/api/v1/providers/{$profile->id}")
            ->assertOk()
            ->assertJsonPath('data.portfolio.0.liked', true)
            ->assertJsonPath('data.portfolio.0.likeCount', 1);

        $this->deleteJson("/api/v1/profile-assets/{$asset->id}/like")
            ->assertOk()
            ->assertJsonPath('data.liked', false)
            ->assertJsonPath('data.likeCount', 0);

        $this->actingAs(User::query()->findOrFail($profile->user_id))
            ->putJson("/api/v1/profile-assets/{$asset->id}/like")
            ->assertStatus(422);
    }

    public function test_provider_can_delete_portfolio_asset(): void
    {
        $disk = (string) config('filesystems.private_assets_disk');
        Storage::fake($disk);
        $user = User::factory()->create();
        $asset = ProfileAsset::query()->create([
            'user_id' => $user->id,
            'purpose' => 'portfolio',
            'disk' => $disk,
            'object_key' => 'profiles/delete-me.jpg',
            'original_name' => 'delete-me.jpg',
            'mime_type' => 'image/jpeg',
            'size_bytes' => 100,
            'scan_status' => 'clean',
        ]);
        Storage::disk($disk)->put($asset->object_key, 'jpeg');

        $this->actingAs($user)
            ->deleteJson("/api/v1/me/profile-assets/{$asset->id}")
            ->assertOk()
            ->assertJsonPath('data.deleted', true);

        $this->assertDatabaseMissing('profile_assets', ['id' => $asset->id]);
        Storage::disk($disk)->assertMissing($asset->object_key);
    }

    public function test_portfolio_upload_is_limited_to_twelve_images(): void
    {
        $disk = (string) config('filesystems.private_assets_disk');
        Storage::fake($disk);
        $user = User::factory()->create();
        for ($index = 0; $index < 12; $index++) {
            ProfileAsset::query()->create([
                'user_id' => $user->id,
                'purpose' => 'portfolio',
                'disk' => $disk,
                'object_key' => "profiles/{$index}.jpg",
                'original_name' => "{$index}.jpg",
                'mime_type' => 'image/jpeg',
                'size_bytes' => 100,
                'scan_status' => 'clean',
                'sort_order' => $index,
            ]);
        }

        $this->actingAs($user)
            ->postJson('/api/v1/me/profile-assets', [
                'purpose' => 'portfolio',
                'file' => UploadedFile::fake()->image('extra.jpg'),
            ])
            ->assertStatus(422);
    }

    /** @return array{ServiceCategory, Area} */
    private function referenceData(): array
    {
        return [ServiceCategory::query()->create(['name' => 'Plumbing', 'slug' => 'plumbing', 'icon' => 'Wrench', 'is_active' => true]),
            Area::query()->create(['type' => 'city', 'name' => 'Davao City', 'code' => 'DVO', 'is_active' => true])];
    }

    /** @return array<string, mixed> */
    private function validProfile(ServiceCategory $category, Area $area): array
    {
        return ['displayName' => 'Juan Repairs', 'bio' => 'Reliable local repairs with careful, friendly service.', 'yearsExperience' => 5,
            'serviceIds' => [$category->id], 'areaIds' => [$area->id], 'availability' => [['dayOfWeek' => 1, 'startsAt' => '08:00', 'endsAt' => '17:00']]];
    }

    private function provider(string $name, string $status, ServiceCategory $category, Area $area): ProviderProfile
    {
        $profile = ProviderProfile::query()->create(['user_id' => User::factory()->create()->id, 'display_name' => $name, 'bio' => 'Experienced and dependable local service provider.', 'status' => $status, 'years_experience' => 4]);
        $profile->services()->attach($category);
        $profile->serviceAreas()->attach($area);
        $this->seedAvatar(User::query()->findOrFail($profile->user_id), 'clean');

        return $profile;
    }

    /** @param array<string, mixed> $payload */
    private function submitProviderProfile(User $user, array $payload): \Illuminate\Testing\TestResponse
    {
        if (! ProfileAsset::query()->where('user_id', $user->id)->where('purpose', 'avatar')->exists()) {
            $this->seedAvatar($user);
        }

        return $this->actingAs($user)->putJson('/api/v1/me/provider-profile', $payload);
    }

    private function seedAvatar(User $user, string $scanStatus = 'pending'): ProfileAsset
    {
        Storage::fake('private-assets');
        $upload = UploadedFile::fake()->image('avatar.jpg', 128, 128);
        $key = "profiles/{$user->id}/avatar/".fake()->uuid().'.jpg';
        Storage::disk('private-assets')->put($key, file_get_contents($upload->getRealPath()) ?: '');

        return ProfileAsset::query()->create([
            'user_id' => $user->id,
            'purpose' => 'avatar',
            'disk' => 'private-assets',
            'object_key' => $key,
            'original_name' => 'avatar.jpg',
            'mime_type' => 'image/jpeg',
            'size_bytes' => 18,
            'scan_status' => $scanStatus,
        ]);
    }
}
