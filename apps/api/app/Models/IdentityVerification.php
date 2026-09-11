<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $user_id
 * @property string $status
 * @property string|null $decision_reason
 * @property Carbon|null $document_expires_at
 * @property Carbon|null $submitted_at
 * @property Carbon|null $reviewed_at
 * @property Carbon|null $verified_until
 * @property Carbon|null $appeal_requested_at
 * @property Carbon|null $consent_withdrawn_at
 * @property int|null $reviewed_by
 * @property int|null $assigned_to
 * @property int|null $appeal_reviewed_by
 * @property User|null $user
 * @property Collection<int, IdentityEvidence> $evidence
 */
#[Fillable(['user_id', 'status', 'consent_purpose', 'consent_version', 'id_type', 'issuing_country', 'document_expires_at', 'name_matches', 'date_of_birth_matches', 'age_eligible', 'decision_reason', 'reviewed_by', 'assigned_to', 'submitted_at', 'reviewed_at', 'verified_until', 'appeal_requested_at', 'appeal_reviewed_by', 'consent_withdrawn_at'])]
class IdentityVerification extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return [
            'document_expires_at' => 'date', 'name_matches' => 'boolean',
            'date_of_birth_matches' => 'boolean', 'age_eligible' => 'boolean',
            'submitted_at' => 'datetime', 'reviewed_at' => 'datetime',
            'verified_until' => 'datetime', 'appeal_requested_at' => 'datetime',
            'consent_withdrawn_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /** @return HasMany<IdentityEvidence, $this> */
    public function evidence(): HasMany
    {
        return $this->hasMany(IdentityEvidence::class);
    }

    /** @return HasMany<IdentityVerificationConsent, $this> */
    public function consents(): HasMany
    {
        return $this->hasMany(IdentityVerificationConsent::class);
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved'
            && ($this->verified_until === null || $this->verified_until->isFuture())
            && $this->consent_withdrawn_at === null;
    }
}
