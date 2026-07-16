<?php

namespace App\Http\Controllers;

use App\Models\CommunityPost;
use App\Models\User;
use App\Support\OutboxRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CommunityController
{
    public function __construct(private readonly OutboxRecorder $outbox) {}

    public function index(): JsonResponse
    {
        abort_unless(config('phase_nine.enabled') && config('phase_nine.community'), 404);
        $posts = CommunityPost::query()->where('moderation_status', 'published')->withCount('reactions')->latest('published_at')->limit(50)->get()->map(fn (CommunityPost $post): array => [
            'id' => $post->id, 'kind' => $post->kind, 'title' => $post->title, 'body' => $post->body, 'areaLabel' => $post->area_label,
            'author' => User::query()->find($post->author_user_id)?->only(['id', 'name']), 'helpfulCount' => $post->reactions_count, 'publishedAt' => $post->published_at?->toIso8601String(),
        ]);

        return response()->json(['data' => $posts]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['kind' => 'required|in:work_story,local_tip,service_question', 'title' => 'required|string|max:120', 'body' => 'required|string|max:3000', 'areaLabel' => 'nullable|string|max:120']);
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $post = DB::transaction(function () use ($data, $user) {
            $post = CommunityPost::query()->create(['id' => (string) Str::uuid(), 'author_user_id' => $user->id, 'kind' => $data['kind'], 'title' => $data['title'], 'body' => $data['body'], 'area_label' => $data['areaLabel'] ?? null, 'moderation_status' => 'published', 'published_at' => now()]);
            $this->outbox->record('community.post.published', 'community_post', $post->id, 1, ['rooms' => ["user:{$user->id}"], 'postId' => $post->id]);

            return $post;
        });

        return response()->json(['data' => $post], 201);
    }

    public function react(Request $request, CommunityPost $communityPost): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_unless($communityPost->moderation_status === 'published', 404);
        DB::table('community_reactions')->upsert([['community_post_id' => $communityPost->id, 'user_id' => $user->id, 'reaction' => 'helpful', 'created_at' => now(), 'updated_at' => now()]], ['community_post_id', 'user_id'], ['reaction', 'updated_at']);

        return response()->json(['data' => ['helpful' => true]]);
    }
}
