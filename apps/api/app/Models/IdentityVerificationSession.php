<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/** @property string $id @property string $identity_verification_id @property string $consent_id @property string $token_hash @property Carbon $expires_at @property Carbon|null $used_at */
#[Fillable(['identity_verification_id', 'consent_id', 'token_hash', 'expires_at', 'used_at'])]
class IdentityVerificationSession extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'used_at' => 'datetime'];
    }
}
