<?php

namespace App\Http\Controllers;

use App\Models\CommunityPost;
use App\Models\CommunityPostMedia;
use App\Support\CommunityPublicPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PublicCommunityController
{
    public function __construct(private readonly CommunityPublicPresenter $presenter) {}

    public function index(): JsonResponse
    {
        $this->enabled();

        $posts = CommunityPost::query()
            ->where('moderation_status', 'published')
            ->latest('published_at')
            ->limit(500)
            ->get(['id', 'title', 'published_at', 'edited_at']);

        return response()->json([
            'data' => $posts->map(fn (CommunityPost $post) => $this->presenter->presentSitemapEntry($post))->values(),
        ]);
    }

    public function feed(Request $request): JsonResponse
    {
        $this->enabled();
        $validated = $request->validate([
            'kind' => 'nullable|in:work_story,local_tip,service_question,official_update',
            'tag' => 'nullable|string|max:40|regex:/^[A-Za-z][A-Za-z0-9_]*$/',
        ]);
        $kind = $validated['kind'] ?? null;
        $tag = isset($validated['tag']) ? strtolower($validated['tag']) : null;

        $page = CommunityPost::query()
            ->where('moderation_status', 'published')
            ->when($kind, fn ($query) => $query->where('kind', $kind))
            ->when($tag, fn ($query) => $query->whereJsonContains('hashtags', $tag))
            ->with(['author', 'area', 'media' => fn ($query) => $query->where('scan_status', 'clean')])
            ->latest('published_at')
            ->cursorPaginate(12);

        $items = $page->items();
        $posts = [];
        foreach ($items as $post) {
            $posts[] = $this->presenter->present($post);
        }

        return response()->json(['data' => $posts, 'meta' => ['nextCursor' => $page->nextCursor()?->encode()]]);
    }

    public function show(CommunityPost $communityPost): JsonResponse
    {
        $this->enabled();
        abort_unless($communityPost->moderation_status === 'published', 404);

        return response()->json(['data' => $this->presenter->present($communityPost)]);
    }

    public function showMedia(CommunityPostMedia $communityPostMedia): StreamedResponse
    {
        $this->enabled();
        abort_unless($communityPostMedia->scan_status === 'clean', 404);
        $post = CommunityPost::query()->findOrFail($communityPostMedia->community_post_id);
        abort_unless($post->moderation_status === 'published', 404);

        return Storage::disk($communityPostMedia->disk)->response(
            $communityPostMedia->object_key,
            $communityPostMedia->original_name,
            [
                'Content-Type' => $communityPostMedia->mime_type,
                'Cache-Control' => 'public, max-age=86400, stale-while-revalidate=604800',
            ],
        );
    }

    private function enabled(): void
    {
        abort_unless(config('phase_nine.enabled') && config('phase_nine.community'), 404);
    }
}
