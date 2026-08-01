<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $reference
 * @property int $customer_user_id
 * @property int|null $assigned_to_user_id
 * @property string|null $service_job_id
 * @property string $category
 * @property string $subject
 * @property string $status
 * @property string $priority
 * @property int $version
 * @property Carbon|null $customer_read_at
 * @property Carbon|null $staff_read_at
 * @property Carbon $last_message_at
 * @property Carbon|null $resolved_at
 * @property Carbon|null $created_at
 * @property User $customer
 * @property User|null $assignee
 * @property-read Collection<int, SupportMessage> $messages
 * @property-read int|null $messages_count
 */
class SupportCase extends Model
{
    use HasUuids;

    protected $attributes = [
        'status' => 'open',
        'priority' => 'normal',
        'version' => 1,
    ];

    protected $guarded = [];

    protected function casts(): array
    {
        return ['customer_read_at' => 'datetime', 'staff_read_at' => 'datetime', 'last_message_at' => 'datetime', 'resolved_at' => 'datetime'];
    }

    /** @return BelongsTo<User, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_user_id');
    }

    /** @return HasMany<SupportMessage, $this> */
    public function messages(): HasMany
    {
        return $this->hasMany(SupportMessage::class);
    }
}
