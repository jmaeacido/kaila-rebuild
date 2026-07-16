<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property Carbon|null $scheduled_at
 * @property Carbon|null $posted_at
 * @property int $version
 * @property int $client_user_id
 * @property int $service_category_id
 * @property int $area_id
 * @property string $status
 */
class ServiceJob extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['scheduled_at' => 'datetime', 'posted_at' => 'datetime', 'latitude' => 'decimal:7', 'longitude' => 'decimal:7'];
    }

    /** @return BelongsTo<ServiceCategory, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(ServiceCategory::class, 'service_category_id');
    }

    /** @return BelongsTo<Area, $this> */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /** @return HasMany<JobOpportunity, $this> */
    public function opportunities(): HasMany
    {
        return $this->hasMany(JobOpportunity::class);
    }

    /** @return HasMany<JobTimelineEvent, $this> */
    public function timeline(): HasMany
    {
        return $this->hasMany(JobTimelineEvent::class)->orderBy('occurred_at');
    }

    /** @return HasMany<JobAsset, $this> */
    public function assets(): HasMany
    {
        return $this->hasMany(JobAsset::class);
    }
}
