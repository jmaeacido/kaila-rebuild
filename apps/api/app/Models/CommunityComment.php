<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $community_post_id
 * @property string|null $parent_comment_id
 * @property int $author_user_id
 * @property string $body
 * @property string $moderation_status
 * @property Carbon|null $created_at
 * @property-read User $author
 * @property-read Collection<int, CommunityComment> $replies
 */
class CommunityComment extends Model
{
    use HasUuids;

    protected $guarded = [];

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_user_id');
    }

    /** @return HasMany<CommunityComment, $this> */
    public function replies(): HasMany
    {
        return $this->hasMany(self::class, 'parent_comment_id')->oldest();
    }
}
