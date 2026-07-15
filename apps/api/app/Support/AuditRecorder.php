<?php

namespace App\Support;

use App\Models\AuditEvent;
use App\Models\User;
use Illuminate\Http\Request;

class AuditRecorder
{
    /**
     * @param  array<string, bool|int|string|null>  $metadata
     */
    public function record(
        Request $request,
        string $eventType,
        ?User $actor = null,
        ?string $subjectType = null,
        ?string $subjectId = null,
        array $metadata = [],
    ): AuditEvent {
        $key = (string) config('app.key');

        return AuditEvent::query()->create([
            'actor_user_id' => $actor?->getKey(),
            'event_type' => $eventType,
            'request_id' => $request->attributes->get('requestId'),
            'trace_id' => $request->attributes->get('traceId'),
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'ip_hash' => hash_hmac('sha256', (string) $request->ip(), $key),
            'user_agent_hash' => hash_hmac('sha256', (string) $request->userAgent(), $key),
            'metadata' => $metadata,
        ]);
    }
}
