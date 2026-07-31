<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $user_id
 * @property string $title
 * @property string $body
 * @property string $resource_id
 * @property array<string, scalar|null> $data
 * @property Carbon|null $read_at
 */
class DurableNotification extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['data' => 'array', 'read_at' => 'datetime', 'cleared_at' => 'datetime'];
    }
}
