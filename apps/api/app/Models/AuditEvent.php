<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'actor_user_id',
    'event_type',
    'request_id',
    'trace_id',
    'subject_type',
    'subject_id',
    'ip_hash',
    'user_agent_hash',
    'metadata',
])]
class AuditEvent extends Model
{
    public const UPDATED_AT = null;

    protected static function booted(): void
    {
        static::updating(function (): void {
            throw new \RuntimeException('audit_events are append-only and cannot be updated.');
        });
        static::deleting(function (): void {
            throw new \RuntimeException('audit_events are append-only and cannot be deleted.');
        });
    }

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }
}
