<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/** @property string $id @property string $identity_verification_id @property string $session_id @property string $kind @property string $disk @property string $object_key @property string $mime_type @property int $size_bytes @property string $sha256 @property string $scan_status @property string|null $scan_signature @property string|null $scan_error @property Carbon|null $scanned_at @property Carbon $purge_after @property Carbon|null $purged_at */
#[Fillable(['identity_verification_id', 'session_id', 'kind', 'disk', 'object_key', 'mime_type', 'size_bytes', 'sha256', 'scan_status', 'scan_signature', 'scan_error', 'scanned_at', 'purge_after', 'purged_at'])]
class IdentityEvidence extends Model
{
    use HasUuids;

    protected $table = 'identity_evidence';

    protected function casts(): array
    {
        return ['scanned_at' => 'datetime', 'purge_after' => 'datetime', 'purged_at' => 'datetime'];
    }

    /** @return BelongsTo<IdentityVerification, $this> */
    public function verification(): BelongsTo
    {
        return $this->belongsTo(IdentityVerification::class, 'identity_verification_id');
    }
}
