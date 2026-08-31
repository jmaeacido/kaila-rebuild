<?php

namespace App\Support;

use App\Models\Area;
use App\Models\ClientProfile;
use App\Models\CommunityPost;
use App\Models\ProviderProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class CommunityFeedContextService
{
    public function __construct(
        private readonly CommunityPostVisibility $visibility,
    ) {}

    /** @return array<string, mixed> */
    public function forUser(User $user): array
    {
        $homeArea = $this->resolveHomeArea($user);
        $areaScope = $homeArea ? $this->areaScopeIds($homeArea) : [];
        $scoped = $this->scopedPosts($user, $areaScope);

        return [
            'homeArea' => $homeArea ? ['id' => $homeArea->id, 'name' => $homeArea->name] : null,
            'trendingTags' => $this->trendingTags($scoped),
            'newProviders' => $this->newProviders($scoped),
        ];
    }

    private function resolveHomeArea(User $user): ?Area
    {
        $clientAreaId = ClientProfile::query()->where('user_id', $user->id)->value('area_id');
        if ($clientAreaId) {
            return Area::query()->find($clientAreaId);
        }

        $provider = ProviderProfile::query()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if (! $provider) {
            return null;
        }

        $areas = $provider->serviceAreas()->get(['areas.id', 'areas.name', 'areas.type', 'areas.parent_id']);
        $locality = $areas->first(fn (Area $area): bool => in_array($area->type, ['city', 'municipality'], true));
        if ($locality) {
            return $locality;
        }

        $barangay = $areas->firstWhere('type', 'barangay');
        if ($barangay?->parent_id) {
            $parent = Area::query()->find($barangay->parent_id);
            if ($parent && in_array($parent->type, ['city', 'municipality'], true)) {
                return $parent;
            }
        }

        return $areas->first(fn (Area $area): bool => $area->type === 'province')
            ?? $areas->first(fn (Area $area): bool => $area->type === 'region')
            ?? $areas->first();
    }

    /** @return list<int> */
    private function areaScopeIds(Area $homeArea): array
    {
        $ids = [$homeArea->id];

        if (in_array($homeArea->type, ['city', 'municipality'], true)) {
            $childIds = Area::query()
                ->where('parent_id', $homeArea->id)
                ->pluck('id')
                ->all();
            $ids = array_values(array_unique([...$ids, ...$childIds]));
        }

        return $ids;
    }

    /** @param list<int> $areaScope
     * @return Builder<CommunityPost>
     */
    private function scopedPosts(User $user, array $areaScope): Builder
    {
        $query = $this->visibility->posts($user);

        if ($areaScope === []) {
            return $query;
        }

        return $query->where(function (Builder $scoped) use ($areaScope): void {
            $scoped->whereIn('area_id', $areaScope)->orWhereNull('area_id');
        });
    }

    /** @return list<array{tag: string, count: int}> */
    private function trendingTags(Builder $scoped): array
    {
        /** @var Collection<int, CommunityPost> $posts */
        $posts = (clone $scoped)
            ->latest('published_at')
            ->limit(80)
            ->get(['id', 'hashtags']);

        $counts = [];
        foreach ($posts as $post) {
            foreach ($post->hashtags ?? [] as $tag) {
                $normalized = strtolower((string) $tag);
                if ($normalized === '') {
                    continue;
                }
                $counts[$normalized] = ($counts[$normalized] ?? 0) + 1;
            }
        }

        arsort($counts);

        $trending = [];
        foreach (array_slice($counts, 0, 8, true) as $tag => $count) {
            $trending[] = ['tag' => $tag, 'count' => $count];
        }

        return $trending;
    }

    /** @return list<array<string, mixed>> */
    private function newProviders(Builder $scoped): array
    {
        $posts = (clone $scoped)
            ->where('kind', 'official_update')
            ->whereJsonContains('hashtags', 'newprovider')
            ->latest('published_at')
            ->limit(4)
            ->get();

        $featuredByPostId = ProviderProfile::query()
            ->whereIn('welcome_community_post_id', $posts->pluck('id'))
            ->where('status', 'active')
            ->get(['id', 'display_name', 'welcome_community_post_id'])
            ->keyBy('welcome_community_post_id');

        $items = [];
        foreach ($posts as $post) {
            $post->loadMissing(['media' => fn ($query) => $query->where('scan_status', 'clean')]);
            $thumb = $post->media->first();
            $profile = $featuredByPostId->get($post->id);

            $items[] = [
                'id' => $post->id,
                'title' => $post->title,
                'areaLabel' => $post->area_label,
                'publishedAt' => $post->published_at?->toIso8601String(),
                'mediaUrl' => $thumb ? "/api/v1/community-media/{$thumb->id}" : null,
                'providerProfileId' => $profile ? (int) $profile->id : null,
                'providerDisplayName' => $profile?->display_name,
            ];
        }

        return $items;
    }
}
