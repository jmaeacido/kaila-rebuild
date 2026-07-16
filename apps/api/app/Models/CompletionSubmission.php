<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $cycle
 * @property string $summary
 * @property Carbon $submitted_at
 * @property-read Collection<int,CompletionEvidence> $evidence
 */
class CompletionSubmission extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['submitted_at' => 'datetime'];
    }

    /** @return HasMany<CompletionEvidence,$this> */
    public function evidence(): HasMany
    {
        return $this->hasMany(CompletionEvidence::class);
    }
}
