<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $provider_profile_id
 * @property string $state
 * @property ServiceJob|null $job
 */
class JobOpportunity extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['seen_at' => 'datetime', 'decided_at' => 'datetime'];
    }

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
}
