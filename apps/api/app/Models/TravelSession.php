<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $status
 * @property int $version
 * @property int|null $last_distance_meters
 * @property int|null $last_eta_seconds
 * @property Carbon $started_at
 * @property Carbon|null $stopped_at
 * @property Carbon|null $arrived_at
 */
class TravelSession extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['consent_confirmed' => 'boolean', 'started_at' => 'datetime', 'stopped_at' => 'datetime', 'arrived_at' => 'datetime'];
    }
}
