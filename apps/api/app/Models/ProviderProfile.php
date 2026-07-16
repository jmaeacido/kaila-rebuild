<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $user_id
 * @property string $display_name
 * @property string|null $rating
 * @property int $completed_jobs
 * @property int|null $response_minutes
 * @property Collection<int, ProviderCredential> $credentials
 */
class ProviderProfile extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['rating' => 'decimal:2'];
    }

    /** @return BelongsToMany<ServiceCategory, $this> */
    public function services(): BelongsToMany
    {
        return $this->belongsToMany(ServiceCategory::class, 'provider_services');
    }

    /** @return BelongsToMany<Area, $this> */
    public function serviceAreas(): BelongsToMany
    {
        return $this->belongsToMany(Area::class, 'provider_service_areas');
    }

    /** @return HasMany<ProviderAvailability, $this> */
    public function availability(): HasMany
    {
        return $this->hasMany(ProviderAvailability::class);
    }

    /** @return HasMany<ProviderCredential, $this> */
    public function credentials(): HasMany
    {
        return $this->hasMany(ProviderCredential::class);
    }

    /** @return HasMany<ProfileAsset, $this> */
    public function portfolio(): HasMany
    {
        return $this->hasMany(ProfileAsset::class, 'user_id', 'user_id')->where('purpose', 'portfolio')->where('scan_status', 'clean')->orderBy('sort_order');
    }
}
