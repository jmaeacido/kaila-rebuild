<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property Carbon|null $created_at
 * @property Carbon|null $reviewed_at
 * @property-read ProviderProfile|null $providerProfile
 * @property-read ProfileAsset|null $asset
 * @property-read User|null $reviewer
 */
class ProviderCredential extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['reviewed_at' => 'datetime', 'created_at' => 'datetime'];
    }

    /** @return BelongsTo<ProviderProfile, $this> */
    public function providerProfile(): BelongsTo
    {
        return $this->belongsTo(ProviderProfile::class);
    }

    /** @return BelongsTo<ProfileAsset, $this> */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(ProfileAsset::class);
    }

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
