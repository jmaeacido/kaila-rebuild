<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $support_case_id
 * @property int $sender_user_id
 * @property string $sender_role
 * @property string $body
 * @property Carbon|null $created_at
 * @property User $sender
 */
class SupportMessage extends Model
{
    use HasUuids;

    protected $guarded = [];

    /** @return BelongsTo<SupportCase, $this> */
    public function supportCase(): BelongsTo
    {
        return $this->belongsTo(SupportCase::class);
    }

    /** @return BelongsTo<User, $this> */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_user_id');
    }
}
