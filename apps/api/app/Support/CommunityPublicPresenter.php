<?php

namespace App\Support;

use App\Models\CommunityPost;
use App\Models\CommunityPostMedia;

class CommunityPublicPresenter
{
    public function __construct(
        private readonly CommunityWelcomeProviderLookup $welcomeProviders,
        private readonly CommunityMentionService $mentions,
    ) {}

    /** @return array<string, mixed> */
    public function present(CommunityPost $post): array
    {
        $post->loadMissing(['author', 'area', 'media' => fn ($query) => $query->where('scan_status', 'clean')]);
        $mention = $this->mentions->fromPost($post);
        $welcomeFeatured = $this->welcomeProviders->forPost($post);
        if ($mention === null && $welcomeFeatured !== null) {
            $mention = $this->mentions->forProviderProfileId($welcomeFeatured['id']);
        }
        $featuredProvider = $welcomeFeatured ?? $this->mentions->asFeaturedProvider($mention);

        return [
            'id' => $post->id,
            'kind' => $post->kind,
            'title' => $post->title,
            'body' => $post->body,
            'hashtags' => array_values($post->hashtags ?? []),
            'area' => $post->area?->only(['id', 'name']),
            'areaLabel' => $post->area_label,
            'author' => $post->author_display_mode === 'official'
                ? ['name' => 'KAILA', 'official' => true]
                : ['name' => $post->author->name, 'official' => false],
            'mention' => $mention,
            'featuredProvider' => $featuredProvider,
            'helpfulCount' => (int) $post->helpful_count,
            'commentsCount' => (int) $post->comments_count,
            'media' => $post->media->map(fn (CommunityPostMedia $media) => $this->presentMedia($media))->values(),
            'publishedAt' => $post->published_at?->toIso8601String(),
            'editedAt' => $post->edited_at?->toIso8601String(),
        ];
    }

    /** @return array{id: string, title: string, publishedAt: string|null, updatedAt: string|null} */
    public function presentSitemapEntry(CommunityPost $post): array
    {
        return [
            'id' => $post->id,
            'title' => $post->title,
            'publishedAt' => $post->published_at?->toIso8601String(),
            'updatedAt' => ($post->edited_at ?? $post->published_at)?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function presentMedia(CommunityPostMedia $media): array
    {
        return [
            'id' => $media->id,
            'originalName' => $media->original_name,
            'mimeType' => $media->mime_type,
            'sizeBytes' => $media->size_bytes,
            'scanStatus' => $media->scan_status,
            'url' => $media->scan_status === 'clean' ? "/api/v1/public/community-media/{$media->id}" : null,
        ];
    }
}
