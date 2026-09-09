<?php

namespace App\Support;

use App\Models\CommunityPost;
use App\Models\CommunityPostMedia;
use App\Models\IdentityVerification;
use App\Models\ProfileAsset;

class CommunityPublicPresenter
{
    public function __construct(
        private readonly CommunityWelcomeProviderLookup $welcomeProviders,
        private readonly CommunityMentionService $mentions,
    ) {}

    /** @return array<string, mixed> */
    public function present(CommunityPost $post): array
    {
        $post->loadMissing(['author', 'area', 'media' => fn ($query) => $query->where('scan_status', 'clean')->orderBy('created_at')]);
        $mention = $this->mentions->fromPost($post);
        $welcomeFeatured = $this->welcomeProviders->forPost($post);
        if ($mention === null && $welcomeFeatured !== null) {
            $mention = $this->mentions->forProviderProfileId($welcomeFeatured['id']);
        }
        $featuredProvider = $welcomeFeatured ?? $this->mentions->asFeaturedProvider($mention);
        $official = $post->author_display_mode === 'official';
        $authorId = (int) $post->author_user_id;

        return [
            'id' => $post->id,
            'kind' => $post->kind,
            'title' => $post->title,
            'body' => $post->body,
            'hashtags' => $post->hashtags ?? [],
            'area' => $post->area?->only(['id', 'name']),
            'areaLabel' => $post->area_label,
            'author' => $official
                ? ['name' => 'KAILA', 'official' => true, 'avatarUrl' => null, 'identityVerified' => false]
                : [
                    'name' => $post->author->name,
                    'official' => false,
                    'avatarUrl' => $this->avatarUrlForUser($authorId),
                    'identityVerified' => $this->identityVerifiedForUser($authorId),
                ],
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

    private function avatarUrlForUser(int $userId): ?string
    {
        $asset = ProfileAsset::query()
            ->where('user_id', $userId)
            ->where('purpose', 'avatar')
            ->where('scan_status', 'clean')
            ->latest()
            ->first();

        return $asset ? "/api/v1/profile-assets/{$asset->getKey()}" : null;
    }

    private function identityVerifiedForUser(int $userId): bool
    {
        $verification = IdentityVerification::query()->where('user_id', $userId)->first();

        return $verification?->isApproved() === true;
    }
}
