<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $user_id
 * @property string $device_name
 * @property Carbon|null $last_used_at
 * @property Carbon|null $revoked_at
 */
class MobileSession extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['last_used_at' => 'datetime', 'revoked_at' => 'datetime'];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<MobileAccessToken, $this> */
    public function accessTokens(): HasMany
    {
        return $this->hasMany(MobileAccessToken::class);
    }

    /** @return HasMany<MobileRefreshToken, $this> */
    public function refreshTokens(): HasMany
    {
        return $this->hasMany(MobileRefreshToken::class);
    }
}
