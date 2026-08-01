<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $context_type
 * @property string $context_id
 * @property int $caller_user_id
 * @property int $callee_user_id
 * @property string $media
 * @property string $status
 * @property Carbon|null $answered_at
 * @property Carbon|null $ended_at
 * @property string|null $ended_reason
 * @property Carbon|null $created_at
 */
class CallSession extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['answered_at' => 'datetime', 'ended_at' => 'datetime'];
    }
}
