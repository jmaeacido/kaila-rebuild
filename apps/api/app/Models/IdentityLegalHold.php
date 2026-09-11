<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/** @property string $id @property string $identity_verification_id @property int $authorized_by @property string $case_reference @property string $reason @property Carbon $starts_at @property Carbon|null $review_at @property Carbon|null $released_at @property int|null $released_by @property string|null $release_reason */
#[Fillable(['identity_verification_id', 'authorized_by', 'case_reference', 'reason', 'starts_at', 'review_at', 'released_at', 'released_by', 'release_reason'])]
class IdentityLegalHold extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'review_at' => 'datetime',
            'released_at' => 'datetime',
        ];
    }

    public function isActive(): bool
    {
        return $this->released_at === null;
    }

    /** @return BelongsTo<IdentityVerification, $this> */
    public function verification(): BelongsTo
    {
        return $this->belongsTo(IdentityVerification::class, 'identity_verification_id');
    }
}
