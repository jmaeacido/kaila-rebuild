<?php

namespace App\Http\Controllers;

use App\Models\CallSession;
use App\Models\DirectConversation;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\HiredJobAccess;
use App\Support\OutboxRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class CallController
{
    public function __construct(private readonly HiredJobAccess $jobAccess, private readonly OutboxRecorder $outbox) {}

    public function store(Request $request): JsonResponse
    {
        abort_unless(config('phase_nine.enabled') && config('phase_nine.calls') && config('phase_nine.turn_configured'), 503, 'Calls are not available until managed TURN is configured.');
        $data = $request->validate(['contextType' => 'required|in:job,direct', 'contextId' => 'required|uuid', 'media' => 'required|in:audio,video']);
        $actor = $this->user($request);
        abort_if(RateLimiter::tooManyAttempts("calls:{$actor->id}", 5), 429);
        RateLimiter::hit("calls:{$actor->id}", 60);
        $calleeId = $this->callee($data['contextType'], $data['contextId'], $actor);
        $call = DB::transaction(function () use ($data, $actor, $calleeId) {
            $call = CallSession::query()->create(['id' => (string) Str::uuid(), 'context_type' => $data['contextType'], 'context_id' => $data['contextId'], 'caller_user_id' => $actor->id, 'callee_user_id' => $calleeId, 'media' => $data['media'], 'status' => 'ringing']);
            $this->outbox->record('call.ringing', 'call_session', $call->id, 1, ['rooms' => ["user:$calleeId", "user:{$actor->id}"], 'callId' => $call->id, 'contextType' => $call->context_type, 'contextId' => $call->context_id, 'media' => $call->media]);

            return $call;
        });

        return response()->json(['data' => $call], 201);
    }

    public function transition(Request $request, CallSession $callSession): JsonResponse
    {
        $data = $request->validate(['action' => 'required|in:answer,decline,end', 'reason' => 'nullable|in:declined,completed,busy,failed']);
        $actor = $this->user($request);
        abort_unless(in_array($actor->id, [$callSession->caller_user_id, $callSession->callee_user_id], true), 404);
        if ($data['action'] === 'answer') {
            abort_unless($actor->id === $callSession->callee_user_id && $callSession->status === 'ringing', 409);
            $callSession->update(['status' => 'active', 'answered_at' => now()]);
        } else {
            abort_unless(in_array($callSession->status, ['ringing', 'active'], true), 409);
            $callSession->update(['status' => $data['action'] === 'decline' ? 'declined' : 'ended', 'ended_at' => now(), 'ended_reason' => $data['reason'] ?? ($data['action'] === 'decline' ? 'declined' : 'completed')]);
        }
        DB::transaction(fn () => $this->outbox->record('call.status.changed', 'call_session', $callSession->id, now()->getTimestamp(), ['rooms' => ["user:{$callSession->caller_user_id}", "user:{$callSession->callee_user_id}"], 'callId' => $callSession->id, 'status' => $callSession->status]));

        return response()->json(['data' => $callSession]);
    }

    private function callee(string $contextType, string $contextId, User $actor): int
    {
        if ($contextType === 'direct') {
            $conversation = DirectConversation::query()->findOrFail($contextId);
            abort_unless($conversation->status === 'accepted' && in_array($actor->id, [$conversation->lower_user_id, $conversation->higher_user_id], true), 404);

            return $conversation->lower_user_id === $actor->id ? $conversation->higher_user_id : $conversation->lower_user_id;
        }
        $participants = $this->jobAccess->requireParticipant(ServiceJob::query()->findOrFail($contextId), $actor);

        return $participants['clientId'] === $actor->id ? $participants['providerId'] : $participants['clientId'];
    }

    private function user(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
