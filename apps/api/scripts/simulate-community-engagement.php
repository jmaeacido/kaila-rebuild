<?php

use App\Models\CommunityPost;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$postId = $argv[1] ?? CommunityPost::query()
    ->where('moderation_status', 'published')
    ->latest('published_at')
    ->value('id');

if (! is_string($postId) || $postId === '') {
    fwrite(STDERR, "No published community post found.\n");
    exit(1);
}

$post = CommunityPost::query()->findOrFail($postId);
$viewer = User::query()->whereKeyNot($post->author_user_id)->orderBy('id')->first()
    ?? User::factory()->create(['name' => 'Community Demo Client']);

Auth::login($viewer);
/** @var \App\Http\Controllers\CommunityController $controller */
$controller = app(\App\Http\Controllers\CommunityController::class);

$helpfulRequest = Request::create("/api/v1/community/{$postId}/helpful", 'PUT');
$helpfulRequest->setUserResolver(static fn () => $viewer);
$commentRequest = Request::create("/api/v1/community/{$postId}/comments", 'POST', ['body' => 'This is a helpful local tip. Thanks for sharing it with the community.']);
$commentRequest->setUserResolver(static fn () => $viewer);

$helpful = $controller->react($helpfulRequest, $post);
$comment = $controller->comment($commentRequest, $post);

$post->refresh();

echo json_encode([
    'postId' => $postId,
    'viewerId' => $viewer->id,
    'viewerName' => $viewer->name,
    'helpful' => $helpful->getData(true),
    'comment' => $comment->getData(true),
    'helpfulCount' => $post->helpful_count,
    'commentsCount' => $post->comments_count,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL;
