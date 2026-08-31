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

        ProfileAsset::query()->create([
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
    }
}
