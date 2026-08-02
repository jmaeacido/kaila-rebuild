<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $phase
 * @property bool $enabled
 * @property string|null $message
 * @property int|null $countdown_seconds
 * @property Carbon|null $scheduled_at
 * @property Carbon|null $activated_at
 * @property int|null $updated_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PlatformMaintenance extends Model
{
    protected $table = 'platform_maintenance';

    protected $fillable = [
        'phase',
        'enabled',
        'message',
        'countdown_seconds',
        'scheduled_at',
        'activated_at',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'countdown_seconds' => 'integer',
            'scheduled_at' => 'datetime',
            'activated_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
