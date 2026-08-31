<?php

namespace Tests\Unit;

use App\Support\CommunityMediaObjectKey;
use PHPUnit\Framework\TestCase;

class CommunityMediaObjectKeyTest extends TestCase
{
    public function test_it_builds_quarantine_published_and_display_names(): void
    {
        $assetId = '11111111-1111-1111-1111-111111111111';
        $postId = '22222222-2222-2222-2222-222222222222';

        $this->assertSame(
            "community/posts/{$postId}/quarantine/{$assetId}.upload",
            CommunityMediaObjectKey::quarantine($postId, $assetId),
        );
        $this->assertSame(
            "community/posts/{$postId}/media/{$assetId}.webp",
            CommunityMediaObjectKey::published($postId, $assetId),
        );
        $this->assertSame("{$assetId}.webp", CommunityMediaObjectKey::displayName($assetId));
    }
}
