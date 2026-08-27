<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\ProfileAsset;
use App\Models\ProviderCredential;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
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

        $this->putJson('/api/v1/me/provider-profile', $this->validProfile($category, $area))
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

        $this->actingAs($user)
            ->putJson('/api/v1/me/provider-profile', $this->validProfile($category, $municipality))
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
        $this->actingAs($user)
            ->putJson('/api/v1/me/provider-profile', $payload)
            ->assertOk()
            ->assertJsonPath('data.status', 'pending_review');

        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin)
            ->getJson('/api/v1/admin/marketplace/review-queue')
            ->assertOk()
            ->assertJsonPath('data.providers.0.id', $provider->id);
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

    public function test_uploads_are_private_and_quarantined_until_scan(): void
    {
        $disk = (string) config('filesystems.private_assets_disk');
        Storage::fake($disk);
        $user = User::factory()->create();
        $response = $this->actingAs($user)->postJson('/api/v1/me/profile-assets', [
            'purpose' => 'portfolio', 'file' => UploadedFile::fake()->image('repair.jpg', 800, 600), 'caption' => 'Completed repair',
        ])->assertCreated()->assertJsonPath('data.scan_status', 'pending');

        $asset = ProfileAsset::query()->findOrFail($response->json('data.id'));
        Storage::disk($disk)->assertExists($asset->object_key);
        $this->getJson("/api/v1/profile-assets/{$asset->id}")->assertStatus(409);
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

        return $profile;
    }
}
