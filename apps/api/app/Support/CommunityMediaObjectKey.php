<?php

namespace App\Support;

final class CommunityMediaObjectKey
{
    public static function quarantine(string $postId, string $assetId): string
    {
        return "community/posts/{$postId}/quarantine/{$assetId}.upload";
    }

    public static function published(string $postId, string $assetId): string
    {
        return "community/posts/{$postId}/media/{$assetId}.webp";
    }

    public static function displayName(string $assetId): string
    {
        return "{$assetId}.webp";
    }
}
