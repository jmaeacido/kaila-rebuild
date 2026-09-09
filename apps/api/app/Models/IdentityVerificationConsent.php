<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/** @property string $id @property string $identity_verification_id @property int $user_id @property string $notice_version @property string $privacy_policy_version @property string $purpose @property string $trigger @property string $request_id @property Carbon $consented_at @property Carbon|null $withdrawn_at */

#[Fillable(['identity_verification_id', 'user_id', 'notice_version', 'privacy_policy_version', 'purpose', 'trigger', 'request_id', 'consented_at', 'withdrawn_at'])]
class IdentityVerificationConsent extends Model
{
    use HasUuids;
    protected function casts(): array { return ['consented_at' => 'datetime', 'withdrawn_at' => 'datetime']; }
}
