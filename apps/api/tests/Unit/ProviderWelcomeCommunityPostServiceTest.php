<?php

namespace Tests\Unit;

use App\Models\Area;
use App\Models\ProfileAsset;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\User;
use App\Support\ProviderWelcomeCommunityPostService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProviderWelcomeCommunityPostServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_welcome_post_prefers_city_over_region_and_includes_service_hashtag(): void
    {
        config(['filesystems.private_assets_disk' => 'private-assets']);
        Storage::fake('private-assets');
        $user = User::factory()->create();
        User::factory()->create(['is_admin' => true]);
        $profile = ProviderProfile::query()->create([
            'user_id' => $user->id,
            'display_name' => 'Local Provider',
            'bio' => 'Reliable local service with careful work and clear communication.',
            'status' => 'active',
            'years_experience' => 4,
        ]);

        $region = Area::query()->create(['type' => 'region', 'name' => 'Region I (Ilocos Region)', 'code' => 'REG1', 'is_active' => true]);
        $city = Area::query()->create(['type' => 'city', 'name' => 'Laoag City', 'code' => 'LAOAG', 'parent_id' => $region->id, 'is_active' => true]);
        $profile->serviceAreas()->attach([$region->id, $city->id]);

        $upload = UploadedFile::fake()->image('avatar.jpg', 64, 64);
        $avatarKey = "profiles/{$user->id}/avatar/test.jpg";
        Storage::disk('private-assets')->put($avatarKey, file_get_contents($upload->getRealPath()) ?: '');

        $avatar = ProfileAsset::query()->create([
            'user_id' => $user->id,
            'purpose' => 'avatar',
            'disk' => 'private-assets',
            'object_key' => $avatarKey,
            'original_name' => 'avatar.jpg',
            'mime_type' => 'image/jpeg',
            'size_bytes' => Storage::disk('private-assets')->size($avatarKey),
            'scan_status' => 'clean',
        ]);

        $service = ServiceCategory::query()->create([
            'name' => 'Plumbing',
            'slug' => 'plumbing',
            'icon' => 'Wrench',
            'is_active' => true,
        ]);
        $profile->services()->attach($service);

        $post = app(ProviderWelcomeCommunityPostService::class)->publishForProvider($profile->fresh());

        $this->assertNotNull($post);
        $this->assertSame('Laoag City', $post->area_label);
        $this->assertStringContainsString('Laoag City', $post->body);
        $this->assertStringNotContainsString('Region I', $post->body);
        $this->assertContains('newprovider', $post->hashtags);
        $this->assertContains('plumbing', $post->hashtags);
        $this->assertSame(1, $post->media()->count());
        $this->assertSame("profile_asset:{$avatar->id}", $post->media()->first()?->scan_signature ?? '');
        $this->assertDatabaseHas('durable_notifications', [
            'user_id' => $user->id,
            'type' => 'community.provider_welcome_published',
            'resource_type' => 'community_post',
            'resource_id' => $post->id,
        ]);
    }

    public function test_welcome_post_replaces_media_when_approved_avatar_changes(): void
    {
        config(['filesystems.private_assets_disk' => 'private-assets']);
        Storage::fake('private-assets');
        $user = User::factory()->create();
        User::factory()->create(['is_admin' => true]);
        $profile = ProviderProfile::query()->create([
            'user_id' => $user->id,
            'display_name' => 'Logo Provider',
            'bio' => 'Reliable local service with careful work and clear communication.',
            'status' => 'active',
            'years_experience' => 4,
        ]);

        $firstUpload = UploadedFile::fake()->image('old.jpg', 64, 64);
        $firstKey = "profiles/{$user->id}/avatar/old.jpg";
        Storage::disk('private-assets')->put($firstKey, file_get_contents($firstUpload->getRealPath()) ?: '');

        $firstAvatar = ProfileAsset::query()->create([
            'user_id' => $user->id,
            'purpose' => 'avatar',
            'origin' => 'upload',
            'disk' => 'private-assets',
            'object_key' => $firstKey,
            'original_name' => 'old.jpg',
            'mime_type' => 'image/jpeg',
            'size_bytes' => Storage::disk('private-assets')->size($firstKey),
            'scan_status' => 'clean',
        ]);

        $service = app(ProviderWelcomeCommunityPostService::class);
        $post = $service->publishForProvider($profile->fresh());
        $this->assertNotNull($post);
        $this->assertSame("profile_asset:{$firstAvatar->id}", $post->media()->first()?->scan_signature);

        $secondUpload = UploadedFile::fake()->image('logo.jpg', 96, 96);
        $secondKey = "profiles/{$user->id}/avatar/logo.jpg";
        Storage::disk('private-assets')->put($secondKey, file_get_contents($secondUpload->getRealPath()) ?: '');

        $secondAvatar = ProfileAsset::query()->create([
            'user_id' => $user->id,
            'purpose' => 'avatar',
            'origin' => 'upload',
            'disk' => 'private-assets',
            'object_key' => $secondKey,
            'original_name' => 'logo.jpg',
            'mime_type' => 'image/jpeg',
            'size_bytes' => Storage::disk('private-assets')->size($secondKey),
            'scan_status' => 'clean',
        ]);
        $firstAvatar->update(['scan_status' => 'rejected']);

        $service->publishForProvider($profile->fresh());
        $post->refresh();

        $this->assertSame(1, $post->media()->count());
        $this->assertSame("profile_asset:{$secondAvatar->id}", $post->media()->first()?->scan_signature);
        $this->assertDatabaseCount('durable_notifications', 1);
    }
}
