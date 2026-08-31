<?php

namespace App\Support;

use App\Models\Area;
use App\Models\CommunityPost;
use App\Models\CommunityPostMedia;
use App\Models\ProfileAsset;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class ProviderWelcomeCommunityPostService
{
    public function __construct(
        private readonly CommunityRealtimePublisher $realtime,
        private readonly CommunityHashtagParser $hashtags,
        private readonly CommunityImageNormalizer $normalizer,
    ) {}

    public function publishForProvider(ProviderProfile $profile): ?CommunityPost
    {
        if (! config('phase_nine.enabled') || ! config('phase_nine.community')) {
            return null;
        }

        $profile->refresh();
        if ($profile->welcome_community_post_id) {
            return CommunityPost::query()->find($profile->welcome_community_post_id);
        }

        if ($profile->status !== 'active') {
            return null;
        }

        $avatar = ProfileAsset::query()
            ->where('user_id', $profile->user_id)
            ->where('purpose', 'avatar')
            ->where('scan_status', 'clean')
            ->orderByDesc('created_at')
            ->first();

        if (! $avatar) {
            return null;
        }

        $admin = User::query()->where('is_admin', true)->orderBy('id')->first();
        if (! $admin) {
            return null;
        }

        return DB::transaction(function () use ($profile, $avatar, $admin): CommunityPost {
            $locked = ProviderProfile::query()->lockForUpdate()->findOrFail($profile->id);
            if ($locked->welcome_community_post_id) {
                return CommunityPost::query()->findOrFail($locked->welcome_community_post_id);
            }

            $locked->load(['services:id,name,slug', 'serviceAreas:id,name,type,parent_id']);
            $displayName = $locked->display_name;
            $serviceNames = $locked->services->pluck('name')->take(3)->implode(', ');
            $welcomeArea = $this->resolveWelcomeArea($locked);
            $areaName = $welcomeArea?->name;
            $title = "Welcome {$displayName} to KAILA";
            $body = "Congratulations to {$displayName} for joining KAILA as a trusted local service provider";
            if ($serviceNames !== '') {
                $body .= " offering {$serviceNames}";
            }
            if ($areaName) {
                $body .= " in {$areaName}";
            }
            $body .= ".\n\nKAILA is proud to welcome {$displayName} to the community. Clients can now discover and book their services on KAILA.\n\n".$this->welcomeHashtags($locked->services);
            $parsed = $this->hashtags->apply($body);

            $post = CommunityPost::query()->create([
                'id' => (string) Str::uuid(),
                'author_user_id' => $admin->id,
                'author_display_mode' => 'official',
                'kind' => 'official_update',
                'title' => $title,
                'body' => $parsed['body'],
                'hashtags' => $parsed['tags'],
                'area_id' => $welcomeArea?->id,
                'area_label' => $areaName,
                'moderation_status' => 'published',
                'published_at' => now(),
            ]);

            $this->attachAvatar($post, $avatar, $admin);
            $locked->update(['welcome_community_post_id' => $post->id]);
            $this->realtime->publish('community.post.published', $post, $admin, notifyEngaged: false);

            return $post;
        });
    }

    private function resolveWelcomeArea(ProviderProfile $profile): ?Area
    {
        /** @var Collection<int, Area> $areas */
        $areas = $profile->relationLoaded('serviceAreas')
            ? $profile->serviceAreas
            : $profile->serviceAreas()->get(['areas.id', 'areas.name', 'areas.type', 'areas.parent_id']);

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

    /** @param Collection<int, ServiceCategory> $services */
    private function welcomeHashtags(Collection $services): string
    {
        $tags = ['#NewProvider', '#WelcomeToKAILA', '#SupportLocal'];
        $service = $services->first();
        if ($service) {
            $serviceTag = $this->serviceHashtag($service);
            if ($serviceTag !== '') {
                $tags[] = $serviceTag;
            }
        }

        return implode(' ', $tags);
    }

    private function serviceHashtag(ServiceCategory $service): string
    {
        $normalized = str_replace('-', ' ', $service->slug);
        $parts = preg_split('/\s+/', trim($normalized)) ?: [];
        $tag = implode('', array_map(static fn (string $part): string => ucfirst(strtolower($part)), array_filter($parts)));

        return $tag !== '' ? "#{$tag}" : '';
    }

    private function attachAvatar(CommunityPost $post, ProfileAsset $avatar, User $admin): void
    {
        abort_unless($avatar->scan_status === 'clean', 422, 'The provider profile picture must be approved before publishing the welcome post.');

        $contents = Storage::disk($avatar->disk)->get($avatar->object_key);
        if ($contents === '') {
            throw new RuntimeException('The provider profile picture could not be read.');
        }

        $normalized = $this->normalizer->normalize($contents);
        $assetId = (string) Str::uuid();
        $disk = (string) config('filesystems.private_assets_disk');
        $publishedKey = CommunityMediaObjectKey::published($post->id, $assetId);
        Storage::disk($disk)->put($publishedKey, $normalized['contents']);

        CommunityPostMedia::query()->create([
            'id' => $assetId,
            'community_post_id' => $post->id,
            'user_id' => $admin->id,
            'disk' => $disk,
            'object_key' => $publishedKey,
            'original_name' => CommunityMediaObjectKey::displayName($assetId),
            'mime_type' => $normalized['mimeType'],
            'size_bytes' => strlen($normalized['contents']),
            'scan_status' => 'clean',
            'scanned_at' => now(),
        ]);
    }
}
