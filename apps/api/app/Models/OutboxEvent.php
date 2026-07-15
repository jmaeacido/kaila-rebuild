<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $event_type
 * @property string $resource_type
 * @property string $resource_id
 * @property int $resource_version
 * @property array<string, mixed> $payload
 * @property Carbon $occurred_at
 * @property Carbon $available_at
 * @property Carbon|null $processing_at
 * @property Carbon|null $published_at
 * @property Carbon|null $failed_at
 * @property int $attempts
 * @property string|null $last_error
 */
class OutboxEvent extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected $attributes = ['attempts' => 0];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'resource_version' => 'integer',
            'occurred_at' => 'datetime',
            'available_at' => 'datetime',
            'processing_at' => 'datetime',
            'published_at' => 'datetime',
            'failed_at' => 'datetime',
            'attempts' => 'integer',
        ];
    }
}
