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
 * @property string $kind
 * @property string $title
 * @property string $body
 * @property list<string>|null $hashtags
 * @property string|null $area_label
 * @property int $author_user_id
 * @property string $moderation_status
 * @property int $reactions_count
 * @property Carbon|null $published_at
 * @property Carbon|null $edited_at
 * @property-read User $author
 * @property-read Area|null $area
 * @property-read Collection<int, CommunityPostMedia> $media
 * @property-read Collection<int, CommunityComment> $comments
 */
class CommunityPost extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['published_at' => 'datetime', 'edited_at' => 'datetime', 'hashtags' => 'array'];
    }

    /** @return HasMany<CommunityReaction, $this> */
    public function reactions(): HasMany
    {
        return $this->hasMany(CommunityReaction::class);
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_user_id');
    }

    /** @return BelongsTo<Area, $this> */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /** @return BelongsTo<ProviderProfile, $this> */
    public function featuredProvider(): BelongsTo
    {
        return $this->belongsTo(ProviderProfile::class, 'featured_provider_profile_id');
    }

    /** @return BelongsTo<User, $this> */
    public function mentionedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'mentioned_user_id');
    }

    /** @return HasMany<CommunityPostMedia, $this> */
    public function media(): HasMany
    {
        return $this->hasMany(CommunityPostMedia::class);
    }

    /** @return HasMany<CommunityComment, $this> */
    public function comments(): HasMany
    {
        return $this->hasMany(CommunityComment::class);
    }
}
