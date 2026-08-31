<?php

use App\Models\Area;
use App\Models\CommunityPost;
use App\Models\CommunityPostMedia;
use App\Models\ProfileAsset;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\User;
use App\Support\ProviderWelcomeCommunityPostService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$admin = User::query()->where('is_admin', true)->orderBy('id')->first();
if (! $admin) {
    fwrite(STDERR, "No admin user found. Run database seeders first.\n");
    exit(1);
}

$sourceImage = realpath(__DIR__.'/../../web/public/brand/kaila-bull-app-icon-v2.png');
if (! is_string($sourceImage) || ! is_file($sourceImage)) {
    fwrite(STDERR, "Expected a source image at apps/web/public/brand/kaila-bull-app-icon-v2.png\n");
    exit(1);
}

$displayName = $argv[1] ?? 'Maya Dela Cruz Plumbing';
$providerProfileId = isset($argv[2]) && is_numeric($argv[2]) ? (int) $argv[2] : null;

$category = ServiceCategory::query()->where('is_active', true)->orderBy('id')->first()
    ?? ServiceCategory::query()->create([
        'name' => 'Plumbing',
        'slug' => 'plumbing-demo-'.Str::lower(Str::random(4)),
        'icon' => 'Wrench',
        'is_active' => true,
    ]);

$area = Area::query()
    ->where('is_active', true)
    ->whereIn('type', ['city', 'municipality'])
    ->orderBy('id')
    ->first()
    ?? Area::query()->create([
        'type' => 'city',
        'name' => 'Davao City',
        'code' => 'DVO-DEMO-'.Str::lower(Str::random(4)),
        'is_active' => true,
    ]);

if ($providerProfileId) {
    $profile = ProviderProfile::query()->findOrFail($providerProfileId);
    $profile->update([
        'status' => 'active',
        'welcome_community_post_id' => null,
        'reviewed_at' => now(),
        'reviewed_by' => $admin->id,
    ]);
} else {
    $providerUser = User::factory()->create([
        'name' => $displayName,
        'email' => 'provider-welcome-demo+'.Str::lower(Str::random(8)).'@kaila.local',
    ]);

    $profile = ProviderProfile::query()->updateOrCreate(
        ['user_id' => $providerUser->id],
        [
            'display_name' => $displayName,
            'bio' => 'Reliable local plumbing with careful work, clear pricing, and friendly service.',
            'years_experience' => 6,
            'status' => 'active',
            'reviewed_at' => now(),
            'reviewed_by' => $admin->id,
            'welcome_community_post_id' => null,
        ],
    );

    $profile->services()->sync([$category->id]);
    $profile->serviceAreas()->sync([$area->id]);
}

$providerUser = User::query()->findOrFail($profile->user_id);
$disk = (string) config('filesystems.private_assets_disk');
$avatarId = (string) Str::uuid();
$avatarKey = "profiles/{$providerUser->id}/avatar/{$avatarId}.png";
Storage::disk($disk)->put($avatarKey, file_get_contents($sourceImage) ?: '');

ProfileAsset::query()
    ->where('user_id', $providerUser->id)
    ->where('purpose', 'avatar')
    ->update(['scan_status' => 'rejected']);

ProfileAsset::query()->create([
    'id' => $avatarId,
    'user_id' => $providerUser->id,
    'purpose' => 'avatar',
    'disk' => $disk,
    'object_key' => $avatarKey,
    'original_name' => 'provider-avatar.png',
    'mime_type' => 'image/png',
    'size_bytes' => Storage::disk($disk)->size($avatarKey),
    'scan_status' => 'clean',
    'reviewed_at' => now(),
    'reviewed_by' => $admin->id,
]);

/** @var ProviderWelcomeCommunityPostService $publisher */
$publisher = app(ProviderWelcomeCommunityPostService::class);
$post = $publisher->publishForProvider($profile->fresh());

if (! $post instanceof CommunityPost) {
    fwrite(STDERR, "Welcome post was not created. Check phase nine community config, admin user, and provider status.\n");
    exit(1);
}

$profile->refresh();
$media = CommunityPostMedia::query()->where('community_post_id', $post->id)->first();

echo json_encode([
    'providerProfileId' => $profile->id,
    'providerUserId' => $profile->user_id,
    'providerDisplayName' => $profile->display_name,
    'welcomeCommunityPostId' => $profile->welcome_community_post_id,
    'post' => [
        'id' => $post->id,
        'title' => $post->title,
        'kind' => $post->kind,
        'authorDisplayMode' => $post->author_display_mode,
        'hashtags' => $post->hashtags,
        'areaLabel' => $post->area_label,
    ],
    'media' => $media ? [
        'id' => $media->id,
        'scanStatus' => $media->scan_status,
        'url' => "/api/v1/community-media/{$media->id}",
    ] : null,
    'communityUrl' => "/community/{$post->id}",
    'feedUrl' => '/community',
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL;
