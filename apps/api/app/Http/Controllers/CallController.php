<?php

namespace App\Http\Controllers;

use App\Models\CallSession;
use App\Models\DirectConversation;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\HiredJobAccess;
use App\Support\NotificationService;
use App\Support\OutboxRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

class CallController
{
    public function __construct(
        private readonly HiredJobAccess $jobAccess,
        private readonly OutboxRecorder $outbox,
        private readonly NotificationService $notifications,
    ) {}

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
            $this->outbox->record('call.ringing', 'call_session', $call->id, 1, ['rooms' => ["user:$calleeId"], 'callId' => $call->id, 'contextType' => $call->context_type, 'contextId' => $call->context_id, 'media' => $call->media]);
            $this->notifications->send(
                $calleeId,
                'call.ringing',
                "Incoming {$call->media} call",
                "{$actor->name} is calling about your job.",
                'call_session',
                $call->id,
                [
                    'callId' => $call->id,
                    'contextType' => $call->context_type,
                    'contextId' => $call->context_id,
                    'media' => $call->media,
                ],
            );

            return $call;
        });
        $this->queueSignal($calleeId, ['type' => 'ringing', 'callId' => $call->id, 'media' => $call->media, 'callerUserId' => $actor->id]);

        return response()->json(['data' => $call], 201);
    }

    public function configuration(Request $request): JsonResponse
    {
        $this->user($request);
        abort_unless(config('phase_nine.enabled') && config('phase_nine.calls') && config('phase_nine.turn_configured'), 503);

        return response()->json(['data' => ['iceServers' => [
            ['urls' => 'stun:stun.l.google.com:19302'],
            ['urls' => array_values(array_filter(array_map('trim', explode(',', (string) config('phase_nine.turn_url'))))), 'username' => config('phase_nine.turn_username'), 'credential' => config('phase_nine.turn_credential')],
        ]]]);
    }

    public function signals(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $key = "kaila:calls:signals:{$user->id}";
        $signals = [];
        for ($index = 0; $index < 100; $index++) {
            $payload = Redis::lpop($key);
            if (! is_string($payload)) {
                break;
            }
            $decoded = json_decode((string) $payload, true);
            if (is_array($decoded)) {
                $signals[] = $decoded;
            }
        }

        return response()->json(['data' => $signals]);
    }

    public function signal(Request $request, CallSession $callSession): JsonResponse
    {
        $data = $request->validate([
            'type' => 'required|in:offer,answer,candidate,hangup',
            'description' => 'nullable|array',
            'candidate' => 'nullable|array',
        ]);
        $actor = $this->user($request);
        abort_unless(in_array($actor->id, [$callSession->caller_user_id, $callSession->callee_user_id], true), 404);
        $recipient = $actor->id === $callSession->caller_user_id ? $callSession->callee_user_id : $callSession->caller_user_id;
        $description = isset($data['description'])
            ? $this->normalizeSessionDescription($data['description'])
            : null;
        $this->queueSignal($recipient, [
            'type' => $data['type'],
            'callId' => $callSession->id,
            'media' => $callSession->media,
            'description' => $description,
            'candidate' => $data['candidate'] ?? null,
        ]);
        if (in_array($data['type'], ['offer', 'answer'], true)) {
            Redis::setex(
                "kaila:calls:state:{$callSession->id}:{$data['type']}",
                120,
                json_encode($description, JSON_THROW_ON_ERROR),
            );
        }

        return response()->json(['data' => ['delivered' => true]]);
    }

    public function signalState(Request $request, CallSession $callSession): JsonResponse
    {
        $actor = $this->user($request);
        abort_unless(in_array($actor->id, [$callSession->caller_user_id, $callSession->callee_user_id], true), 404);
        $offer = Redis::get("kaila:calls:state:{$callSession->id}:offer");
        $answer = Redis::get("kaila:calls:state:{$callSession->id}:answer");

        return response()->json(['data' => [
            'offer' => is_string($offer) ? json_decode($offer, true) : null,
            'answer' => is_string($answer) ? json_decode($answer, true) : null,
        ]]);
    }

    public function transition(Request $request, CallSession $callSession): JsonResponse
    {
        $data = $request->validate(['action' => 'required|in:answer,decline,end', 'reason' => 'nullable|in:declined,completed,busy,failed']);
        $actor = $this->user($request);
        abort_unless(in_array($actor->id, [$callSession->caller_user_id, $callSession->callee_user_id], true), 404);
        if ($data['action'] === 'answer') {
            abort_unless($actor->id === $callSession->callee_user_id, 409);
            abort_unless(in_array($callSession->status, ['ringing', 'active'], true), 409);
            if ($callSession->status === 'ringing') {
                $callSession->update(['status' => 'active', 'answered_at' => now()]);
            }
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

    /** @param array<string, mixed> $payload */
    private function queueSignal(int $userId, array $payload): void
    {
        $key = "kaila:calls:signals:$userId";
        Redis::rpush($key, json_encode($payload, JSON_THROW_ON_ERROR));
        Redis::expire($key, 120);
    }

    /**
     * Laravel trims request strings, but WebRTC requires SDP to end with CRLF.
     *
     * @param  array<string, mixed>  $description
     * @return array<string, mixed>
     */
    private function normalizeSessionDescription(array $description): array
    {
        if (isset($description['sdp']) && is_string($description['sdp'])) {
            $lines = preg_split('/\r\n|\r|\n/', $description['sdp']);
            $description['sdp'] = implode("\r\n", $lines ?: [])."\r\n";
        }

        return $description;
    }
}
