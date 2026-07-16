<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $service_job_id
 * @property string $offer_thread_id
 * @property string $offer_revision_id
 * @property int $provider_profile_id
 * @property int $amount_centavos
 * @property string $availability_text
 * @property string|null $estimated_duration_text
 * @property string $scope
 * @property string|null $message
 * @property Carbon $accepted_at
 */
class AcceptedOfferSnapshot extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['accepted_at' => 'datetime'];
    }
}
