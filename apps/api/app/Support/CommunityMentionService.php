<?php

namespace App\Support;

use App\Models\ClientProfile;
use App\Models\CommunityComment;
use App\Models\CommunityPost;
use App\Models\ProfileAsset;
use App\Models\ProviderProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CommunityMentionService
{
    /** @return list<int> */
    public function blockedUserIds(int $viewerUserId): array
    {
        return DB::table('user_blocks')
            ->select('blocked_user_id')
            ->where('blocker_user_id', $viewerUserId)
            ->union(
                DB::table('user_blocks')
                    ->selectRaw('blocker_user_id as blocked_user_id')
                    ->where('blocked_user_id', $viewerUserId),
            )
            ->pluck('blocked_user_id')
            ->map(fn ($id): int => (int) $id)
            ->all();
    }

    /** @return list<array{userId: int, displayName: string, providerProfileId: int|null, kind: string, avatarUrl: string|null}> */
    public function search(User $viewer, string $query = ''): array
    {
        $blocked = $this->blockedUserIds((int) $viewer->id);
        $needle = trim($query);
        $candidates = [];

        $providers = ProviderProfile::query()
            ->where('status', 'active')
            ->when($blocked !== [], fn ($builder) => $builder->whereNotIn('user_id', $blocked))
            ->when($needle !== '', fn ($builder) => $builder->where('display_name', 'like', '%'.$needle.'%'))
            ->orderBy('display_name')
            ->limit(6)
            ->get(['id', 'user_id', 'display_name']);

        $providerUserIds = [];
        foreach ($providers as $profile) {
            $providerUserIds[] = (int) $profile->user_id;
            $candidates[] = [
                'userId' => (int) $profile->user_id,
                'displayName' => (string) $profile->display_name,
                'providerProfileId' => (int) $profile->id,
                'kind' => 'provider',
                'avatarUrl' => $this->avatarUrlForUser((int) $profile->user_id),
            ];
        }

        $remaining = max(0, 6 - count($candidates));
        if ($remaining === 0) {
            return $candidates;
        }

        $clients = User::query()
            ->select(['users.id', 'users.name', 'client_profiles.display_name'])
            ->leftJoin('client_profiles', 'client_profiles.user_id', '=', 'users.id')
            ->when($blocked !== [], fn ($builder) => $builder->whereNotIn('users.id', $blocked))
            ->when($providerUserIds !== [], fn ($builder) => $builder->whereNotIn('users.id', $providerUserIds))
            ->when($needle !== '', function ($builder) use ($needle): void {
                $builder->where(function ($scoped) use ($needle): void {
                    $scoped->where('client_profiles.display_name', 'like', '%'.$needle.'%')
                        ->orWhere('users.name', 'like', '%'.$needle.'%');
                });
            })
            ->orderByRaw('COALESCE(client_profiles.display_name, users.name)')
            ->limit($remaining)
            ->get();

        foreach ($clients as $client) {
            $displayName = trim((string) ($client->display_name ?: $client->name));
            if ($displayName === '') {
                continue;
            }

            $candidates[] = [
                'userId' => (int) $client->id,
                'displayName' => $displayName,
                'providerProfileId' => null,
                'kind' => 'client',
                'avatarUrl' => $this->avatarUrlForUser((int) $client->id),
            ];
        }

        return $candidates;
    }

    /** @return array{mentioned_user_id: int|null, featured_provider_profile_id: int|null} */
    public function resolveStorage(?int $mentionedUserId, ?int $featuredProviderProfileId, User $actor): array
    {
        if ($featuredProviderProfileId !== null) {
            $profile = ProviderProfile::query()
                ->whereKey($featuredProviderProfileId)
                ->where('status', 'active')
                ->first(['id', 'user_id']);
            abort_unless($profile, 422, 'Only active provider profiles can be mentioned.');
            $this->assertMentionable((int) $profile->user_id, $actor);

            return [
                'mentioned_user_id' => (int) $profile->user_id,
                'featured_provider_profile_id' => (int) $profile->id,
            ];
        }

        if ($mentionedUserId !== null) {
            $this->assertMentionable($mentionedUserId, $actor);
            $providerProfileId = ProviderProfile::query()
                ->where('user_id', $mentionedUserId)
                ->where('status', 'active')
                ->value('id');

            return [
                'mentioned_user_id' => $mentionedUserId,
                'featured_provider_profile_id' => $providerProfileId ? (int) $providerProfileId : null,
            ];
        }

        return ['mentioned_user_id' => null, 'featured_provider_profile_id' => null];
    }

    public function assertMentionable(int $mentionedUserId, User $actor): void
    {
        abort_unless($mentionedUserId !== (int) $actor->id, 422, 'You cannot mention yourself.');
        abort_if(in_array($mentionedUserId, $this->blockedUserIds((int) $actor->id), true), 422, 'That member cannot be mentioned.');

        $mentionable = User::query()->whereKey($mentionedUserId)->whereNull('banned_at')->exists()
            && (
                ClientProfile::query()->where('user_id', $mentionedUserId)->exists()
                || ProviderProfile::query()->where('user_id', $mentionedUserId)->where('status', 'active')->exists()
            );
        abort_unless($mentionable, 422, 'That member cannot be mentioned.');
    }

    /** @return array{userId: int, displayName: string, providerProfileId: int|null, kind: string}|null */
    public function fromPost(CommunityPost $post): ?array
    {
        if ($post->mentioned_user_id) {
            return $this->forUserId((int) $post->mentioned_user_id, $post->featured_provider_profile_id ? (int) $post->featured_provider_profile_id : null);
        }

        if ($post->featured_provider_profile_id) {
            return $this->forProviderProfileId((int) $post->featured_provider_profile_id);
        }

        return null;
    }

    /** @return array{userId: int, displayName: string, providerProfileId: int|null, kind: string}|null */
    public function fromComment(CommunityComment $comment): ?array
    {
        if ($comment->mentioned_user_id) {
            return $this->forUserId((int) $comment->mentioned_user_id, $comment->featured_provider_profile_id ? (int) $comment->featured_provider_profile_id : null);
        }

        if ($comment->featured_provider_profile_id) {
            return $this->forProviderProfileId((int) $comment->featured_provider_profile_id);
        }

        return null;
    }

    /** @return array{userId: int, displayName: string, providerProfileId: int|null, kind: string}|null */
    public function forProviderProfileId(int $providerProfileId): ?array
    {
        $profile = ProviderProfile::query()
            ->whereKey($providerProfileId)
            ->where('status', 'active')
            ->first(['id', 'user_id', 'display_name']);
        if (! $profile) {
            return null;
        }

        return [
            'userId' => (int) $profile->user_id,
            'displayName' => (string) $profile->display_name,
            'providerProfileId' => (int) $profile->id,
            'kind' => 'provider',
        ];
    }

    /** @return array{userId: int, displayName: string, providerProfileId: int|null, kind: string}|null */
    private function forUserId(int $userId, ?int $providerProfileId = null): ?array
    {
        $user = User::query()->find($userId, ['id', 'name']);
        if (! $user) {
            return null;
        }

        if ($providerProfileId) {
            $profile = ProviderProfile::query()
                ->whereKey($providerProfileId)
                ->where('user_id', $userId)
                ->where('status', 'active')
                ->first(['id', 'display_name']);
            if ($profile) {
                return [
                    'userId' => $userId,
                    'displayName' => (string) $profile->display_name,
                    'providerProfileId' => (int) $profile->id,
                    'kind' => 'provider',
                ];
            }
        }

        $clientName = ClientProfile::query()->where('user_id', $userId)->value('display_name');

        return [
            'userId' => $userId,
            'displayName' => (string) ($clientName ?: $user->name),
            'providerProfileId' => null,
            'kind' => 'client',
        ];
    }

  /** @param array{userId: int, displayName: string, providerProfileId: int|null, kind: string}|null $mention
   * @return array{id: int, displayName: string}|null */
    public function asFeaturedProvider(?array $mention): ?array
    {
        if (! $mention || ! $mention['providerProfileId']) {
            return null;
        }

        return ['id' => $mention['providerProfileId'], 'displayName' => $mention['displayName']];
    }

    private function avatarUrlForUser(int $userId): ?string
    {
        $asset = ProfileAsset::query()
            ->where('user_id', $userId)
            ->where('purpose', 'avatar')
            ->where('scan_status', 'clean')
            ->latest()
            ->first(['id']);

        return $asset ? "/api/v1/profile-assets/{$asset->id}" : null;
    }
}
