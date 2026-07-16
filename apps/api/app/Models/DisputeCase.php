<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $status
 * @property string $resume_state
 * @property int $appeal_count
 * @property int|null $assigned_to_user_id
 * @property Carbon|null $decided_at
 */
class DisputeCase extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['decided_at' => 'datetime'];
    }

    /** @return HasMany<DisputeCaseAction,$this> */
    public function actions(): HasMany
    {
        return $this->hasMany(DisputeCaseAction::class);
    }

    /** @return HasMany<DisputeEvidence,$this> */
    public function evidence(): HasMany
    {
        return $this->hasMany(DisputeEvidence::class);
    }
}
