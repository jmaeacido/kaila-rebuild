<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string $id
 * @property int $user_id
 * @property string $title
 * @property string $body
 * @property string $resource_id
 * @property array<string, scalar|null> $data
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
