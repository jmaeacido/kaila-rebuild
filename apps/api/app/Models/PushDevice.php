<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PushDevice extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['token_encrypted' => 'encrypted', 'last_seen_at' => 'datetime', 'revoked_at' => 'datetime'];
    }
}
