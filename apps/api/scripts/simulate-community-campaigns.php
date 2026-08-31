<?php

use App\Contracts\MalwareScanner;
use App\Http\Controllers\CommunityController;
use App\Jobs\ScanCommunityPostMedia;
use App\Models\CommunityPost;
use App\Models\User;
use App\Support\CommunityImageNormalizer;
use App\Support\MalwareScanResult;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$admin = User::query()->where('is_admin', true)->orderBy('id')->first();
if (! $admin) {
    fwrite(STDERR, "No admin user found. Run database seeders first.\n");
    exit(1);
}

/** @var list<string> */
$sourceImages = [
    realpath(__DIR__.'/../../web/public/brand/kaila-bull-app-icon-v2.png'),
    realpath(__DIR__.'/../../web/public/brand/kaila-wordmark.png'),
    realpath(__DIR__.'/../../web/public/brand/kaila-app-icon.png'),
    realpath(__DIR__.'/../../web/public/android-chrome-512x512.png'),
    realpath(__DIR__.'/../../web/public/brand/kaila-wordmark-bull-v1.png'),
    realpath(__DIR__.'/../../web/public/android-chrome-192x192.png'),
];

$sourceImages = array_values(array_filter($sourceImages, static fn (?string $path): bool => is_string($path) && $path !== '' && is_file($path)));
if (count($sourceImages) < 4) {
    fwrite(STDERR, "Expected at least four source images under apps/web/public.\n");
    exit(1);
}

/** @var list<array{title: string, body: string, mediaCount: int, minutesAgo: int}> */
$campaigns = [
    [
        'title' => 'Campaign layout demo · 2 photos',
        'body' => 'Official KAILA campaign preview with two attachments to test the feed grid.',
        'mediaCount' => 2,
        'minutesAgo' => 3,
    ],
    [
        'title' => 'Campaign layout demo · 3 photos',
        'body' => 'Official KAILA campaign preview with three attachments to test the feed grid.',
        'mediaCount' => 3,
        'minutesAgo' => 2,
    ],
    [
        'title' => 'Campaign layout demo · 4 photos',
        'body' => 'Official KAILA campaign preview with four attachments to test the feed grid.',
        'mediaCount' => 4,
        'minutesAgo' => 1,
    ],
];

$scanner = new class implements MalwareScanner
{
    public function scan($stream): MalwareScanResult
    {
        return MalwareScanResult::clean();
    }
};

/** @var CommunityController $controller */
$controller = app(CommunityController::class);
$normalizer = app(CommunityImageNormalizer::class);

Auth::login($admin);
$created = [];
$imageIndex = 0;

foreach ($campaigns as $campaign) {
    $storeRequest = Request::create('/api/v1/community', 'POST', [
        'kind' => 'official_update',
        'title' => $campaign['title'],
        'body' => $campaign['body'],
        'official' => true,
    ]);
    $storeRequest->setUserResolver(static fn () => $admin);

    $response = $controller->store($storeRequest);
    if ($response->getStatusCode() !== 201) {
        fwrite(STDERR, "Failed to create campaign: {$campaign['title']}\n");
        exit(1);
    }

    $postId = $response->getData(true)['data']['id'];
    $post = CommunityPost::query()->findOrFail($postId);
    $post->update(['published_at' => now()->subMinutes($campaign['minutesAgo'])]);

    $mediaIds = [];
    for ($slot = 0; $slot < $campaign['mediaCount']; $slot++) {
        $source = $sourceImages[$imageIndex % count($sourceImages)];
        $imageIndex++;

        $uploaded = new UploadedFile(
            $source,
            basename($source),
            mime_content_type($source) ?: 'image/png',
            null,
            true,
        );

        $mediaRequest = Request::create("/api/v1/community/{$postId}/media", 'POST', [], [], ['file' => $uploaded]);
        $mediaRequest->setUserResolver(static fn () => $admin);
        $mediaRequest->files->set('file', $uploaded);

        $mediaResponse = $controller->storeMedia($mediaRequest, $post->fresh());
        if ($mediaResponse->getStatusCode() !== 201) {
            fwrite(STDERR, "Failed to upload media for campaign: {$campaign['title']}\n");
            exit(1);
        }

        $mediaId = $mediaResponse->getData(true)['data']['id'];
        (new ScanCommunityPostMedia($mediaId))->handle($scanner, $normalizer);
        $mediaIds[] = $mediaId;
    }

    $created[] = [
        'postId' => $postId,
        'title' => $campaign['title'],
        'mediaCount' => $campaign['mediaCount'],
        'mediaIds' => $mediaIds,
        'communityUrl' => "/community/{$postId}",
    ];
}

echo json_encode([
    'authorId' => $admin->id,
    'authorName' => $admin->name,
    'campaigns' => $created,
    'feedUrl' => '/community',
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL;
