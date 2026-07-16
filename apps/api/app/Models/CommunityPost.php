<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $kind
 * @property string $title
 * @property string $body
 * @property string|null $area_label
 * @property int $author_user_id
 * @property string $moderation_status
 * @property int $reactions_count
 * @property Carbon|null $published_at
 */
class CommunityPost extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['published_at' => 'datetime'];
    }

    /** @return HasMany<CommunityReaction, $this> */
    public function reactions(): HasMany
    {
        return $this->hasMany(CommunityReaction::class);
    }
}
