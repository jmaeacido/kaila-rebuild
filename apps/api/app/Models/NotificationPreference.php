<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $user_id
 * @property bool $mute_messages
 * @property bool $mute_routine_reminders
 * @property string|null $quiet_hours_start
 * @property string|null $quiet_hours_end
 * @property string $timezone
 */
class NotificationPreference extends Model
{
    protected $primaryKey = 'user_id';

    public $incrementing = false;

    protected $guarded = [];

    protected $attributes = [
        'mute_messages' => false,
        'mute_routine_reminders' => false,
        'timezone' => 'Asia/Manila',
    ];

    protected function casts(): array
    {
        return [
            'mute_messages' => 'boolean',
            'mute_routine_reminders' => 'boolean',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
