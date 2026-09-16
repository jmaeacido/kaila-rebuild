<?php

namespace App\Support;

use App\Models\CommunityPost;
use App\Models\ProviderProfile;

class CommunityWelcomeProviderLookup
{
    /** @return array{id: int, publicSlug: string, displayName: string}|null */
    public function forPost(CommunityPost $post): ?array
    {
        $map = $this->forPostIds([$post->id]);

        return $map[$post->id] ?? null;
    }

    /**
     * @param  list<string>  $postIds
     * @return array<string, array{id: int, publicSlug: string, displayName: string}>
     */
    public function forPostIds(array $postIds): array
    {
        if ($postIds === []) {
            return [];
        }

        $map = [];
        foreach (ProviderProfile::query()
            ->whereIn('welcome_community_post_id', $postIds)
            ->where('status', 'active')
            ->get(['id', 'public_slug', 'display_name', 'welcome_community_post_id']) as $profile) {
            if ($profile->welcome_community_post_id) {
                $map[$profile->welcome_community_post_id] = [
                    'id' => (int) $profile->id,
                    'publicSlug' => (string) $profile->public_slug,
                    'displayName' => (string) $profile->display_name,
                ];
            }
        }

        $remaining = array_diff($postIds, array_keys($map));
        if ($remaining === []) {
            return $map;
        }

        foreach (CommunityPost::query()
            ->whereIn('id', $remaining)
            ->whereNotNull('featured_provider_profile_id')
            ->with(['featuredProvider:id,public_slug,display_name,status'])
            ->get(['id', 'featured_provider_profile_id']) as $post) {
            $profile = $post->featuredProvider;
            if ($profile && $profile->status === 'active') {
                $map[$post->id] = [
                    'id' => (int) $profile->id,
                    'publicSlug' => (string) $profile->public_slug,
                    'displayName' => (string) $profile->display_name,
                ];
            }
        }

        return $map;
    }
}
