<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $mobile_session_id
 * @property Carbon $expires_at
 * @property Carbon|null $revoked_at
 * @property-read MobileSession $mobileSession
 */
class MobileAccessToken extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'revoked_at' => 'datetime'];
    }

    /** @return BelongsTo<MobileSession, $this> */
    public function mobileSession(): BelongsTo
    {
        return $this->belongsTo(MobileSession::class);
    }
}
