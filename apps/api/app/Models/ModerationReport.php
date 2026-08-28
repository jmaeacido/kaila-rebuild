<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $reporter_user_id
 * @property string|null $target_type
 * @property string|null $target_id
 * @property string $category
 * @property string $details
 * @property string $status
 * @property Carbon|null $decided_at
 * @property Carbon|null $created_at
 */
class ModerationReport extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['decided_at' => 'datetime'];
    }

    /** @return HasMany<ModerationReportAction, $this> */
    public function actions(): HasMany
    {
        return $this->hasMany(ModerationReportAction::class);
    }

    /** @return HasMany<ModerationReportEvidence, $this> */
    public function evidence(): HasMany
    {
        return $this->hasMany(ModerationReportEvidence::class);
    }
}
