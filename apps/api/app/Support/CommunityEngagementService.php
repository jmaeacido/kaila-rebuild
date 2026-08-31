<?php

namespace App\Support;

use App\Models\CommunityComment;
use App\Models\CommunityPost;
use Illuminate\Support\Facades\DB;

class CommunityEngagementService
{
    /** @return list<int> */
    public function engagedUserIds(CommunityPost $post): array
    {
        return collect([$post->author_user_id])
            ->merge(
                DB::table('community_reactions')
                    ->where('community_post_id', $post->id)
                    ->pluck('user_id'),
            )
            ->merge(
                CommunityComment::query()
                    ->where('community_post_id', $post->id)
                    ->where('moderation_status', 'published')
                    ->pluck('author_user_id'),
            )
            ->map(static fn (mixed $id): int => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    /** @return list<int> */
    public function notificationRecipients(CommunityPost $post, int $excludeUserId): array
    {
        $candidates = collect($this->engagedUserIds($post))
            ->reject(static fn (int $id): bool => $id === $excludeUserId)
            ->values()
            ->all();

        return $this->filterBlockedAgainstAuthor($post->author_user_id, $candidates);
    }

    /** @param list<int> $userIds
     * @return list<int>
     */
    private function filterBlockedAgainstAuthor(int $authorUserId, array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        $blockedUserIds = DB::table('user_blocks')
            ->where(static function ($query) use ($authorUserId, $userIds): void {
                $query->where('blocked_user_id', $authorUserId)
                    ->whereIn('blocker_user_id', $userIds)
                    ->orWhere(static function ($nested) use ($authorUserId, $userIds): void {
                        $nested->where('blocker_user_id', $authorUserId)
                            ->whereIn('blocked_user_id', $userIds);
                    });
            })
            ->get()
            ->flatMap(static fn ($row): array => [
                (int) $row->blocker_user_id,
                (int) $row->blocked_user_id,
            ])
            ->unique()
            ->reject(static fn (int $id): bool => $id === $authorUserId)
            ->values()
            ->all();

        return collect($userIds)
            ->reject(static fn (int $id): bool => in_array($id, $blockedUserIds, true))
            ->values()
            ->all();
    }
}
