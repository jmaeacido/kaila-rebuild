<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $service_job_id
 * @property int $provider_profile_id
 * @property string $status
 * @property int $latest_revision_number
 * @property ServiceJob|null $job
 * @property ProviderProfile|null $provider
 * @property Collection<int, OfferRevision> $revisions
 */
class OfferThread extends Model
{
    use HasUuids;

    protected $guarded = [];

    /** @return BelongsTo<ServiceJob, $this> */
    public function job(): BelongsTo
    {
        return $this->belongsTo(ServiceJob::class, 'service_job_id');
    }

    /** @return BelongsTo<ProviderProfile, $this> */
    public function provider(): BelongsTo
    {
        return $this->belongsTo(ProviderProfile::class, 'provider_profile_id');
    }

    /** @return HasMany<OfferRevision, $this> */
    public function revisions(): HasMany
    {
        return $this->hasMany(OfferRevision::class)->orderBy('revision_number');
    }
}
