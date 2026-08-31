<?php

namespace App\Http\Controllers;

use App\Jobs\ScanCommunityPostMedia;
use App\Models\Area;
use App\Models\CommunityComment;
use App\Models\CommunityPost;
use App\Models\CommunityPostMedia;
use App\Models\ProfileAsset;
use App\Models\User;
use App\Support\CommunityFeedContextService;
use App\Support\CommunityHashtagParser;
use App\Support\CommunityMediaObjectKey;
use App\Support\CommunityPostVisibility;
use App\Support\CommunityRealtimePublisher;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CommunityController
{
    public function __construct(
        private readonly CommunityRealtimePublisher $realtime,
        private readonly CommunityHashtagParser $hashtags,
        private readonly CommunityPostVisibility $visibility,
        private readonly CommunityFeedContextService $feedContext,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $this->enabled();
        $validated = $request->validate([
            'kind' => 'nullable|in:work_story,local_tip,service_question,official_update',
            'tag' => 'nullable|string|max:40|regex:/^[A-Za-z][A-Za-z0-9_]*$/',
        ]);
        $kind = $validated['kind'] ?? null;
        $tag = isset($validated['tag']) ? strtolower($validated['tag']) : null;
        $page = $this->visibility->posts($user)
            ->when($kind, fn (Builder $query) => $query->where('kind', $kind))
            ->when($tag, fn (Builder $query) => $query->whereJsonContains('hashtags', $tag))
            ->latest('published_at')
            ->cursorPaginate(12);

        $posts = [];
        foreach ($page->items() as $post) {
            $posts[] = $this->present($post, $user);
        }

        return response()->json(['data' => $posts, 'meta' => ['nextCursor' => $page->nextCursor()?->encode()]]);
    }

    public function feedContext(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $this->enabled();

        return response()->json(['data' => $this->feedContext->forUser($user)]);
    }

    public function show(Request $request, CommunityPost $communityPost): JsonResponse
    {
        $user = $this->user($request);
        $this->assertVisible($communityPost, $user);

        return response()->json(['data' => $this->present($communityPost, $user)]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $this->enabled();
        $data = $request->validate(['kind' => 'required|in:work_story,local_tip,service_question,official_update', 'title' => 'required|string|max:120', 'body' => 'required|string|max:3000', 'areaId' => 'nullable|integer|exists:areas,id', 'official' => 'nullable|boolean']);
        abort_if($data['kind'] === 'official_update' && ! $user->is_admin, 403);
        $area = isset($data['areaId']) ? Area::query()->whereKey((int) $data['areaId'])->first() : null;
        $post = DB::transaction(function () use ($data, $user, $area): CommunityPost {
            $parsed = $this->hashtags->apply(trim($data['body']));
            $post = CommunityPost::query()->create(['id' => (string) Str::uuid(), 'author_user_id' => $user->id, 'author_display_mode' => ($data['official'] ?? false) && $user->is_admin ? 'official' : 'member', 'kind' => $data['kind'], 'title' => trim($data['title']), 'body' => $parsed['body'], 'hashtags' => $parsed['tags'], 'area_id' => $area?->id, 'area_label' => $area?->name, 'moderation_status' => 'published', 'published_at' => now()]);
            $this->realtime->publish('community.post.published', $post, $user, notifyEngaged: false);

            return $post;
        });

        return response()->json(['data' => $this->present($post, $user)], 201);
    }

    public function update(Request $request, CommunityPost $communityPost): JsonResponse
    {
        $user = $this->user($request);
        $this->owns($communityPost, $user);
        $data = $request->validate(['kind' => 'required|in:work_story,local_tip,service_question,official_update', 'title' => 'required|string|max:120', 'body' => 'required|string|max:3000', 'areaId' => 'nullable|integer|exists:areas,id']);
        abort_if($data['kind'] === 'official_update' && ! $user->is_admin, 403);
        $area = isset($data['areaId']) ? Area::query()->whereKey((int) $data['areaId'])->first() : null;
        DB::transaction(function () use ($communityPost, $data, $area, $user): void {
            $parsed = $this->hashtags->apply(trim($data['body']));
            $communityPost->update(['kind' => $data['kind'], 'title' => trim($data['title']), 'body' => $parsed['body'], 'hashtags' => $parsed['tags'], 'area_id' => $area?->id, 'area_label' => $area?->name, 'edited_at' => now()]);
            $this->realtime->publish('community.post.updated', $communityPost, $user);
        });

        return response()->json(['data' => $this->present($communityPost->refresh(), $user)]);
    }

    public function destroy(Request $request, CommunityPost $communityPost): JsonResponse
    {
        $user = $this->user($request);
        $this->owns($communityPost, $user);
        DB::transaction(function () use ($communityPost, $user): void {
            $communityPost->update(['moderation_status' => 'deleted']);
            $this->realtime->publish('community.post.deleted', $communityPost, $user);
        });

        return response()->json(['data' => ['id' => $communityPost->id, 'deleted' => true]]);
    }

    public function react(Request $request, CommunityPost $communityPost): JsonResponse
    {
        $user = $this->user($request);
        $this->assertVisible($communityPost, $user);
        DB::transaction(function () use ($communityPost, $user): void {
            DB::table('community_reactions')->updateOrInsert(['community_post_id' => $communityPost->id, 'user_id' => $user->id], ['reaction' => 'helpful', 'created_at' => now(), 'updated_at' => now()]);
            $communityPost->update(['helpful_count' => DB::table('community_reactions')->where('community_post_id', $communityPost->id)->count()]);
            $this->realtime->publish('community.post.updated', $communityPost, $user, ['action' => 'helpful']);
        });

        return response()->json(['data' => ['helpful' => true, 'helpfulCount' => $communityPost->helpful_count]]);
    }

    public function unreact(Request $request, CommunityPost $communityPost): JsonResponse
    {
        $user = $this->user($request);
        $this->assertVisible($communityPost, $user);
        DB::transaction(function () use ($communityPost, $user): void {
            DB::table('community_reactions')->where(['community_post_id' => $communityPost->id, 'user_id' => $user->id])->delete();
            $communityPost->update(['helpful_count' => DB::table('community_reactions')->where('community_post_id', $communityPost->id)->count()]);
            $this->realtime->publish('community.post.updated', $communityPost, $user, ['action' => 'unhelpful']);
        });

        return response()->json(['data' => ['helpful' => false, 'helpfulCount' => $communityPost->helpful_count]]);
    }

    public function storeMedia(Request $request, CommunityPost $communityPost): JsonResponse
    {
        $user = $this->user($request);
        $this->owns($communityPost, $user);
        $request->validate(['file' => ['required', 'file', 'max:8192', function (string $attribute, mixed $value, \Closure $fail): void {
            if (! is_object($value) || ! method_exists($value, 'getMimeType')) {
                $fail('The file must be an image.');

                return;
            }

            $mime = $value->getMimeType();
            if (! is_string($mime) || ! str_starts_with($mime, 'image/')) {
                $fail('The file must be an image.');
            }
        }]]);
        abort_if($communityPost->media()->count() >= 4, 422, 'A community post can have at most four images.');
        $file = $request->file('file');
        $id = (string) Str::uuid();
        $disk = (string) config('filesystems.private_assets_disk');
        $key = CommunityMediaObjectKey::quarantine($communityPost->id, $id);
        $stream = fopen($file->getRealPath(), 'r');
        if ($stream === false) {
            abort(422, 'The uploaded image could not be read.');
        }
        Storage::disk($disk)->put($key, $stream);
        if (is_resource($stream)) {
            fclose($stream);
        }
        $asset = CommunityPostMedia::query()->create(['id' => $id, 'community_post_id' => $communityPost->id, 'user_id' => $user->id, 'disk' => $disk, 'object_key' => $key, 'original_name' => CommunityMediaObjectKey::displayName($id), 'mime_type' => $file->getMimeType() ?: 'application/octet-stream', 'size_bytes' => $file->getSize(), 'scan_status' => 'pending']);
        ScanCommunityPostMedia::dispatch($asset->id);

        return response()->json(['data' => $this->presentMedia($asset)], 201);
    }

    public function showMedia(Request $request, CommunityPostMedia $communityPostMedia): StreamedResponse
    {
        $user = $this->user($request);
        $post = CommunityPost::query()->findOrFail($communityPostMedia->community_post_id);
        $this->assertVisible($post, $user);
        abort_unless($communityPostMedia->scan_status === 'clean', 404);

        return Storage::disk($communityPostMedia->disk)->response($communityPostMedia->object_key, $communityPostMedia->original_name, ['Content-Type' => $communityPostMedia->mime_type, 'Cache-Control' => 'private, max-age=3600']);
    }

    public function comments(Request $request, CommunityPost $communityPost): JsonResponse
    {
        $user = $this->user($request);
        $this->assertVisible($communityPost, $user);
        $rows = $communityPost->comments()->whereNull('parent_comment_id')->where('moderation_status', 'published')->with(['author', 'replies' => fn ($query) => $query->where('moderation_status', 'published')->with('author')])->oldest()->cursorPaginate(20);

        $items = $rows->items();
        $avatars = $this->avatarUrlsForUsers($this->commentAuthorIds($items));
        $postAuthorUserId = $communityPost->author_user_id;
        $comments = [];
        foreach ($items as $comment) {
            $comments[] = $this->presentComment($comment, $user, $avatars, $postAuthorUserId);
        }

        return response()->json(['data' => $comments, 'meta' => ['nextCursor' => $rows->nextCursor()?->encode()]]);
    }

    public function comment(Request $request, CommunityPost $communityPost): JsonResponse
    {
        $user = $this->user($request);
        $this->assertVisible($communityPost, $user);
        $body = $request->validate(['body' => 'required|string|max:800'])['body'];
        $comment = DB::transaction(function () use ($communityPost, $user, $body): CommunityComment {
            $comment = CommunityComment::query()->create(['id' => (string) Str::uuid(), 'community_post_id' => $communityPost->id, 'author_user_id' => $user->id, 'body' => trim($body), 'moderation_status' => 'published']);
            $communityPost->increment('comments_count');
            $this->realtime->publish('community.comment.created', $communityPost, $user, ['commentId' => $comment->id]);

            return $comment;
        });

        $comment->load('author');
        $avatars = $this->avatarUrlsForUsers([$comment->author_user_id]);

        return response()->json(['data' => $this->presentComment($comment, $user, $avatars, $communityPost->author_user_id)], 201);
    }

    public function reply(Request $request, CommunityPost $communityPost, CommunityComment $communityComment): JsonResponse
    {
        $user = $this->user($request);
        $this->assertVisible($communityPost, $user);
        abort_unless($communityComment->community_post_id === $communityPost->id && ! $communityComment->parent_comment_id, 404);
        $body = $request->validate(['body' => 'required|string|max:800'])['body'];
        $reply = DB::transaction(function () use ($communityPost, $communityComment, $user, $body): CommunityComment {
            $reply = CommunityComment::query()->create(['id' => (string) Str::uuid(), 'community_post_id' => $communityPost->id, 'parent_comment_id' => $communityComment->id, 'author_user_id' => $user->id, 'body' => trim($body), 'moderation_status' => 'published']);
            $communityPost->increment('comments_count');
            $this->realtime->publish('community.comment.created', $communityPost, $user, [
                'commentId' => $reply->id,
                'replyToCommentId' => $communityComment->id,
            ]);

            return $reply;
        });

        $reply->load('author');
        $avatars = $this->avatarUrlsForUsers([$reply->author_user_id]);

        return response()->json(['data' => $this->presentComment($reply, $user, $avatars, $communityPost->author_user_id)], 201);
    }

    public function updateComment(Request $request, CommunityComment $communityComment): JsonResponse
    {
        $user = $this->user($request);
        abort_unless($communityComment->author_user_id === $user->id, 403);
        abort_unless($communityComment->moderation_status === 'published', 404);
        $body = $request->validate(['body' => 'required|string|max:800'])['body'];
        $post = CommunityPost::query()->findOrFail($communityComment->community_post_id);
        $this->assertVisible($post, $user);
        DB::transaction(function () use ($communityComment, $post, $user, $body): void {
            $communityComment->update(['body' => trim($body)]);
            $this->realtime->publish('community.comment.updated', $post, $user, ['commentId' => $communityComment->id]);
        });
        $communityComment->load('author');
        $avatars = $this->avatarUrlsForUsers([$communityComment->author_user_id]);

        return response()->json(['data' => $this->presentComment($communityComment, $user, $avatars, $post->author_user_id)]);
    }

    public function destroyComment(Request $request, CommunityComment $communityComment): JsonResponse
    {
        $user = $this->user($request);
        $post = CommunityPost::query()->findOrFail($communityComment->community_post_id);
        $isAuthor = $communityComment->author_user_id === $user->id;
        $isPostOwner = $post->author_user_id === $user->id;
        abort_unless($isAuthor || $isPostOwner || $user->is_admin, 403);
        DB::transaction(function () use ($communityComment, $post, $isAuthor, $user): void {
            $communityComment->update(['moderation_status' => $isAuthor || $user->is_admin ? 'deleted' : 'hidden']);
            $post->update(['comments_count' => $post->comments()->where('moderation_status', 'published')->count()]);
            $this->realtime->publish('community.comment.deleted', $post, $user, ['commentId' => $communityComment->id]);
        });

        return response()->json(['data' => ['id' => $communityComment->id, 'deleted' => true]]);
    }

    public function blockAuthor(Request $request, CommunityPost $communityPost): JsonResponse
    {
        $user = $this->user($request);
        $this->assertVisible($communityPost, $user);
        abort_if($communityPost->author_user_id === $user->id || $communityPost->author->is_admin, 422, 'This member cannot be blocked.');
        DB::transaction(function () use ($communityPost, $user): void {
            DB::table('user_blocks')->updateOrInsert(
                ['blocker_user_id' => $user->id, 'blocked_user_id' => $communityPost->author_user_id],
                ['created_at' => now(), 'updated_at' => now()],
            );
            $this->realtime->publishFeedRefresh($user, $communityPost);
        });

        return response()->json(['data' => ['blocked' => true, 'userId' => $communityPost->author_user_id]]);
    }

    /** @return array<string, mixed> */
    private function present(CommunityPost $post, User $user): array
    {
        $post->loadMissing(['author', 'area', 'media' => fn ($query) => $query->where('scan_status', 'clean')]);

        return ['id' => $post->id, 'kind' => $post->kind, 'title' => $post->title, 'body' => $post->body, 'hashtags' => array_values($post->hashtags ?? []), 'area' => $post->area?->only(['id', 'name']), 'areaLabel' => $post->area_label, 'author' => $post->author_display_mode === 'official' ? ['id' => $post->author_user_id, 'name' => 'KAILA', 'official' => true] : ['id' => $post->author_user_id, 'name' => $post->author->name, 'official' => false], 'helpful' => DB::table('community_reactions')->where(['community_post_id' => $post->id, 'user_id' => $user->id])->exists(), 'helpfulCount' => (int) $post->helpful_count, 'commentsCount' => (int) $post->comments_count, 'media' => $post->media->map(fn ($media) => $this->presentMedia($media))->values(), 'canManage' => $post->author_user_id === $user->id, 'publishedAt' => $post->published_at?->toIso8601String(), 'editedAt' => $post->edited_at?->toIso8601String()];
    }

    /** @return array<string, mixed> */
    private function presentMedia(CommunityPostMedia $media): array
    {
        return ['id' => $media->id, 'originalName' => $media->original_name, 'mimeType' => $media->mime_type, 'sizeBytes' => $media->size_bytes, 'scanStatus' => $media->scan_status, 'url' => $media->scan_status === 'clean' ? "/api/v1/community-media/{$media->id}" : null];
    }

    /** @param array<int, string> $avatars */
    private function presentComment(CommunityComment $comment, User $user, array $avatars = [], int $postAuthorUserId = 0): array
    {
        $authorId = $comment->author_user_id;
        $isAuthor = $authorId === $user->id;
        $isPostOwner = $postAuthorUserId === $user->id;

        return ['id' => $comment->id, 'body' => $comment->body, 'author' => ['id' => $authorId, 'name' => $comment->author->name, 'avatarUrl' => $avatars[$authorId] ?? null], 'canEdit' => $isAuthor, 'canDelete' => $isAuthor || $user->is_admin, 'canHide' => $isPostOwner && ! $isAuthor, 'createdAt' => $comment->created_at?->toIso8601String(), 'replies' => $comment->relationLoaded('replies') ? $comment->replies->map(fn ($reply) => $this->presentComment($reply, $user, $avatars, $postAuthorUserId))->values() : []];
    }

    /** @param iterable<CommunityComment> $comments
     * @return list<int>
     */
    private function commentAuthorIds(iterable $comments): array
    {
        $ids = [];
        foreach ($comments as $comment) {
            $ids[] = $comment->author_user_id;
            if ($comment->relationLoaded('replies')) {
                foreach ($comment->replies as $reply) {
                    $ids[] = $reply->author_user_id;
                }
            }
        }

        return array_values(array_unique($ids));
    }

    /** @param list<int> $userIds
     * @return array<int, string>
     */
    private function avatarUrlsForUsers(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        $map = [];
        foreach (ProfileAsset::query()->whereIn('user_id', $userIds)->where('purpose', 'avatar')->where('scan_status', 'clean')->orderByDesc('created_at')->get() as $asset) {
            if (! isset($map[$asset->user_id])) {
                $map[$asset->user_id] = "/api/v1/profile-assets/{$asset->id}";
            }
        }

        return $map;
    }

    private function assertVisible(CommunityPost $post, User $user): void
    {
        abort_unless($post->moderation_status === 'published' && $this->visibility->posts($user)->whereKey($post->id)->exists(), 404);
    }

    private function owns(CommunityPost $post, User $user): void
    {
        abort_unless($post->author_user_id === $user->id, 403);
    }

    private function enabled(): void
    {
        abort_unless(config('phase_nine.enabled') && config('phase_nine.community'), 404);
    }

    private function user(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
