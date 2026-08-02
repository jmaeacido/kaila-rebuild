<?php

namespace App\Http\Controllers;

use App\Models\CallSession;
use App\Models\ClientProfile;
use App\Models\DirectConversation;
use App\Models\ProfileAsset;
use App\Models\ProviderProfile;
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
        $callerName = $this->displayName($actor);
        $callerAvatarUrl = $this->avatarUrl($actor);
        $call = DB::transaction(function () use ($data, $actor, $calleeId, $callerName, $callerAvatarUrl) {
            $call = CallSession::query()->create(['id' => (string) Str::uuid(), 'context_type' => $data['contextType'], 'context_id' => $data['contextId'], 'caller_user_id' => $actor->id, 'callee_user_id' => $calleeId, 'media' => $data['media'], 'status' => 'ringing']);
            $this->outbox->record('call.ringing', 'call_session', $call->id, 1, [
                'rooms' => ["user:$calleeId"],
                'callId' => $call->id,
                'contextType' => $call->context_type,
                'contextId' => $call->context_id,
                'media' => $call->media,
                'callerName' => $callerName,
                'callerAvatarUrl' => $callerAvatarUrl,
                'callerUserId' => $actor->id,
            ]);
            $this->notifications->send(
                $calleeId,
                'call.ringing',
                "Incoming {$call->media} call",
                "{$callerName} is calling about your job.",
                'call_session',
                $call->id,
                [
                    'callId' => $call->id,
                    'contextType' => $call->context_type,
                    'contextId' => $call->context_id,
                    'media' => $call->media,
                    'callerName' => $callerName,
                    'callerAvatarUrl' => $callerAvatarUrl,
                    'callerUserId' => $actor->id,
                    'action' => 'ring',
                ],
            );

            return $call;
        });
        $this->queueSignal($calleeId, [
            'type' => 'ringing',
            'callId' => $call->id,
            'media' => $call->media,
            'callerUserId' => $actor->id,
            'callerName' => $callerName,
            'callerAvatarUrl' => $callerAvatarUrl,
            'contextType' => $call->context_type,
            'contextId' => $call->context_id,
        ]);

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
        abort_if($actor->id !== $callSession->caller_user_id && $actor->id !== $callSession->callee_user_id, 404);
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
        abort_if($actor->id !== $callSession->caller_user_id && $actor->id !== $callSession->callee_user_id, 404);
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
        abort_if($actor->id !== $callSession->caller_user_id && $actor->id !== $callSession->callee_user_id, 404);
        $updated = DB::transaction(function () use ($callSession, $actor, $data): CallSession {
            $locked = CallSession::query()->lockForUpdate()->findOrFail($callSession->id);
            if ($data['action'] === 'answer') {
                abort_unless($actor->id === $locked->callee_user_id, 409);
                abort_unless(in_array($locked->status, ['ringing', 'active'], true), 409);
                if ($locked->status === 'ringing') {
                    $locked->update(['status' => 'active', 'answered_at' => now()]);
                }
            } else {
                abort_unless(in_array($locked->status, ['ringing', 'active'], true), 409);
                $locked->update(['status' => $data['action'] === 'decline' ? 'declined' : 'ended', 'ended_at' => now(), 'ended_reason' => $data['reason'] ?? ($data['action'] === 'decline' ? 'declined' : 'completed')]);
            }
            $locked->refresh();
            $this->outbox->record('call.status.changed', 'call_session', $locked->id, now()->getTimestamp(), [
                'rooms' => ["user:{$locked->caller_user_id}", "user:{$locked->callee_user_id}"],
                'callId' => $locked->id,
                'status' => $locked->status,
                'contextType' => $locked->context_type,
                'contextId' => $locked->context_id,
                'media' => $locked->media,
            ]);
            // Ephemeral cancel pushes clear native ringing UI without inbox clutter.
            foreach ([$locked->caller_user_id, $locked->callee_user_id] as $userId) {
                $this->notifications->send(
                    $userId,
                    'call.status.changed',
                    'Call update',
                    'The call status changed.',
                    'call_session',
                    $locked->id,
                    [
                        'callId' => $locked->id,
                        'contextType' => $locked->context_type,
                        'contextId' => $locked->context_id,
                        'media' => $locked->media,
                        'status' => $locked->status,
                        'action' => 'cancel',
                        'hideFromInbox' => '1',
                    ],
                );
            }

            return $locked;
        });

        return response()->json(['data' => $updated]);
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

    private function displayName(User $user): string
    {
        if ($user->active_mode === 'provider') {
            $name = ProviderProfile::query()->where('user_id', $user->id)->value('display_name');
            if (is_string($name) && $name !== '') {
                return $name;
            }
        }
        $name = ClientProfile::query()->where('user_id', $user->id)->value('display_name');

        return is_string($name) && $name !== '' ? $name : $user->name;
    }

    private function avatarUrl(User $user): ?string
    {
        $avatar = ProfileAsset::query()->where('user_id', $user->id)->where('purpose', 'avatar')->where('scan_status', 'clean')->latest()->first();

        return $avatar ? "/api/v1/profile-assets/{$avatar->id}" : null;
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
