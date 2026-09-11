<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/** @property string $id @property string $identity_evidence_id @property string $identity_verification_id @property string $disk @property string $object_key @property Carbon $purged_at */
#[Fillable(['identity_evidence_id', 'identity_verification_id', 'disk', 'object_key', 'purged_at'])]
class IdentityDeletionTombstone extends Model
{
    use HasUuids;

    protected $table = 'identity_deletion_tombstones';

    protected function casts(): array
    {
        return ['purged_at' => 'datetime'];
    }
}
