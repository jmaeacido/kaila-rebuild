<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $offer_thread_id
 * @property int $revision_number
 * @property int $proposed_by_user_id
 * @property int $amount_centavos
 * @property string $availability_text
 * @property string|null $estimated_duration_text
 * @property string $scope
 * @property string|null $message
 * @property Carbon|null $expires_at
 * @property Carbon $created_at
 */
class OfferRevision extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime'];
    }

    /** @return BelongsTo<OfferThread, $this> */
    public function thread(): BelongsTo
    {
        return $this->belongsTo(OfferThread::class, 'offer_thread_id');
    }
}
