<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id', 'outcome', 'blockers', 'identity_hash', 'completed_at'])]
class AccountDeletionRecord extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return ['blockers' => 'array', 'completed_at' => 'datetime'];
    }
}
