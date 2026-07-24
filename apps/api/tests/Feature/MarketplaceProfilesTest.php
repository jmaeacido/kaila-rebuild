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
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MarketplaceProfilesTest extends TestCase
{
    use RefreshDatabase;

    public function test_provider_can_create_a_valid_profile_and_switch_mode_without_gaining_admin_authority(): void
    {
        [$category, $area] = $this->referenceData();
        $user = User::factory()->create();

        $this->actingAs($user)->putJson('/api/v1/me/active-mode', ['activeMode' => 'provider'])
            ->assertOk()->assertJsonPath('data.activeMode', 'provider');

        $this->putJson('/api/v1/me/provider-profile', $this->validProfile($category, $area))
            ->assertOk()->assertJsonPath('data.status', 'pending_review');

        $this->getJson('/api/v1/admin/marketplace/review-queue')->assertForbidden();
        $this->assertDatabaseHas('provider_services', ['service_category_id' => $category->id]);
        $this->assertDatabaseHas('provider_service_areas', ['area_id' => $area->id]);
    }

    public function test_discovery_is_deterministic_and_excludes_ineligible_or_out_of_area_profiles(): void
    {
        [$category, $area] = $this->referenceData();
        $otherArea = Area::query()->create(['type' => 'city', 'name' => 'Cebu City', 'code' => 'CEB', 'is_active' => true]);
        $eligible = $this->provider('Eligible Provider', 'active', $category, $area);
        $this->provider('Still Reviewing', 'pending_review', $category, $area);
        $this->provider('Wrong Area', 'active', $category, $otherArea);

        $this->actingAs(User::factory()->create())
            ->getJson("/api/v1/providers?categoryId={$category->id}&areaId={$area->id}")
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $eligible->id)->assertJsonPath('data.0.verified', false);
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
