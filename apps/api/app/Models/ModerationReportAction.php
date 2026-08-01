<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $action
 * @property string $reason
 * @property array<string, mixed> $metadata
 * @property Carbon $occurred_at
 */
class ModerationReportAction extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['metadata' => 'array', 'occurred_at' => 'datetime'];
    }
}
