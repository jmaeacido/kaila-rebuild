<?php

namespace App\Support;

use App\Models\CommunityPost;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class CommunityPostVisibility
{
    /** @return Builder<CommunityPost> */
    public function posts(User $user): Builder
    {
        $blocked = DB::table('user_blocks')
            ->select('blocked_user_id')
            ->where('blocker_user_id', $user->id)
            ->union(
                DB::table('user_blocks')
                    ->select('blocker_user_id')
                    ->where('blocked_user_id', $user->id),
            );

        return CommunityPost::query()
            ->where('moderation_status', 'published')
            ->whereNotIn('author_user_id', $blocked)
            ->with(['author', 'area', 'media' => fn ($query) => $query->where('scan_status', 'clean')]);
    }
}
