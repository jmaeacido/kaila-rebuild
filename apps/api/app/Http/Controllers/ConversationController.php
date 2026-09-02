<?php

namespace App\Http\Controllers;

use App\Models\AcceptedOfferSnapshot;
use App\Models\CallSession;
use App\Models\ConversationMessage;
use App\Models\JobConversation;
use App\Models\ProfileAsset;
use App\Models\ProviderProfile;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\HiredJobAccess;
use App\Support\NotificationService;
use App\Support\OutboxRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ConversationController extends Controller
{
    private const ALLOWED_REACTIONS = ['👍', '👎', '❤️', '😂', '🤣', '😮', '😢', '😭', '😡', '🎉', '🔥', '👏', '🙏', '💯', '✅', '👀', '🤔', '🙌'];

    public function __construct(private readonly HiredJobAccess $access, private readonly OutboxRecorder $outbox, private readonly NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User, 401);
        $messageableStatuses = ['provider_selected', 'provider_traveling', 'working', 'completion_submitted'];
        $providerProfileIds = ProviderProfile::query()->where('user_id', $actor->id)->pluck('id');
        $providerJobIds = AcceptedOfferSnapshot::query()->whereIn('provider_profile_id', $providerProfileIds)->pluck('service_job_id');
        $jobs = ServiceJob::query()
            ->whereIn('status', $messageableStatuses)
            ->where(function ($query) use ($actor, $providerProfileIds, $providerJobIds): void {
                $query->where('client_user_id', $actor->id)
                    ->orWhereIn('id', $providerJobIds)
                    ->orWhereIn('direct_provider_profile_id', $providerProfileIds);
            })
            ->latest('updated_at')
            ->limit(100)
            ->get();

        $snapshots = AcceptedOfferSnapshot::query()->whereIn('service_job_id', $jobs->pluck('id'))->get()->keyBy('service_job_id');
        $selectedProfileIds = $jobs->map(function (ServiceJob $job) use ($snapshots): ?int {
            $snapshot = $snapshots->get($job->id);

            return $snapshot !== null ? $snapshot->provider_profile_id : $job->direct_provider_profile_id;
        })->filter()->unique();
        $profiles = ProviderProfile::query()->whereIn('id', $selectedProfileIds)->get()->keyBy('id');
        $counterpartUserIds = $jobs->map(function (ServiceJob $job) use ($actor, $snapshots, $profiles): ?int {
            if ($job->client_user_id !== $actor->id) {
                return $job->client_user_id;
            }
            $snapshot = $snapshots->get($job->id);
            $profileId = $snapshot !== null ? $snapshot->provider_profile_id : $job->direct_provider_profile_id;

            return $profiles->get($profileId)?->user_id;
        })->filter()->unique();
        $users = User::query()->whereIn('id', $counterpartUserIds)->get()->keyBy('id');
        $avatars = ProfileAsset::query()
            ->whereIn('user_id', $counterpartUserIds)
            ->where('purpose', 'avatar')
            ->where('scan_status', 'clean')
            ->orderByRaw("CASE WHEN origin = 'upload' THEN 0 ELSE 1 END")
            ->latest()->get()->unique('user_id')->keyBy('user_id');
        $conversations = JobConversation::query()->whereIn('service_job_id', $jobs->pluck('id'))->get()->keyBy('service_job_id');
        $lastMessages = ConversationMessage::query()
            ->whereIn('conversation_id', $conversations->pluck('id'))
            ->orderByDesc('sequence')->get()->unique('conversation_id')->keyBy('conversation_id');

        $data = $jobs->map(function (ServiceJob $job) use ($actor, $snapshots, $profiles, $users, $avatars, $conversations, $lastMessages): array {
            $snapshot = $snapshots->get($job->id);
            $profileId = $snapshot !== null ? $snapshot->provider_profile_id : $job->direct_provider_profile_id;
            $counterpartId = $job->client_user_id === $actor->id ? $profiles->get($profileId)?->user_id : $job->client_user_id;
            $counterpart = $users->get($counterpartId);
            abort_unless($counterpart instanceof User, 404);
            $conversation = $conversations->get($job->id);
            $lastMessage = $conversation ? $lastMessages->get($conversation->id) : null;

            return [
                'jobId' => $job->id,
                'jobTitle' => $job->title,
                'jobStatus' => $job->status,
                'role' => $job->client_user_id === $actor->id ? 'client' : 'provider',
                'otherParty' => [
                    'id' => $counterpart->id,
                    'name' => $counterpart->name,
                    'avatarUrl' => $avatars->get($counterpart->id) ? "/api/v1/profile-assets/{$avatars->get($counterpart->id)->getKey()}" : null,
                ],
                'lastMessage' => $lastMessage ? [
                    'body' => $lastMessage->body_ciphertext === null ? 'Sent an attachment' : Crypt::decryptString($lastMessage->body_ciphertext),
                    'sentByMe' => $lastMessage->sender_user_id === $actor->id,
                    'createdAt' => $lastMessage->created_at?->toIso8601String(),
                ] : null,
                'updatedAt' => ($conversation !== null ? $conversation->updated_at : $job->updated_at)?->toIso8601String(),
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function show(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User, 401);
        $participants = $this->access->participants($serviceJob);
        if (! in_array($actor->id, $participants, true)) {
            abort_unless($actor->is_admin && $request->filled('accessReason'), 404);
        }
        $conversation = JobConversation::query()->firstOrCreate(['service_job_id' => $serviceJob->id], ['id' => (string) Str::uuid()]);
        if (! in_array($actor->id, $participants, true)) {
            DB::table('conversation_access_audits')->insert(['id' => (string) Str::uuid(), 'conversation_id' => $conversation->id, 'staff_user_id' => $actor->id, 'reason' => $request->string('accessReason')->trim()->value(), 'accessed_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        }
        $messages = $conversation->messages()->orderByDesc('sequence')->limit(50)->get()->reverse()->values()->map(function ($message) use ($actor): array {
            $assets = DB::table('message_assets')->where('message_id', $message->id)->get();
            $reactions = DB::table('message_reactions')
                ->where('message_id', $message->id)
                ->selectRaw('reaction, count(*) as total')
                ->groupBy('reaction')
                ->pluck('total', 'reaction');
            $viewerReactions = DB::table('message_reactions')->where('message_id', $message->id)->where('user_id', $actor->id)->pluck('reaction');

            return [
                'id' => $message->id,
                'sequence' => $message->sequence,
                'senderUserId' => $message->sender_user_id,
                'body' => $message->body_ciphertext === null ? null : Crypt::decryptString($message->body_ciphertext),
                'keyVersion' => $message->encryption_key_version,
                'createdAt' => $message->created_at?->toIso8601String(),
                'assets' => $assets->map(fn ($asset) => [
                    'id' => $asset->id,
                    'name' => $asset->original_name,
                    'mimeType' => $asset->mime_type,
                    'scanStatus' => $asset->scan_status,
                    'url' => $asset->scan_status === 'clean' ? "/api/v1/message-assets/{$asset->id}" : null,
                ]),
                'reactions' => $reactions,
                'viewerReactions' => $viewerReactions,
            ];
        });
        $otherUserId = $actor->id === $participants['clientId'] ? $participants['providerId'] : $participants['clientId'];
        $otherUser = User::query()->findOrFail($otherUserId);
        $avatar = ProfileAsset::query()->where('user_id', $otherUserId)->where('purpose', 'avatar')->where('scan_status', 'clean')->latest()->first();

        return response()->json(['data' => [
            'id' => $conversation->id,
            'jobId' => $serviceJob->id,
            'version' => $conversation->version,
            'viewerUserId' => $actor->id,
            'otherParty' => ['id' => $otherUser->id, 'name' => $otherUser->name, 'avatarUrl' => $avatar ? "/api/v1/profile-assets/{$avatar->id}" : null],
            'messages' => $messages,
            'calls' => CallSession::query()
                ->where('context_type', 'job')
                ->where('context_id', $serviceJob->id)
                ->oldest()
                ->get()
                ->map(fn (CallSession $call): array => [
                    'id' => $call->id,
                    'media' => $call->media,
                    'status' => $call->status,
                    'viewerDirection' => $call->caller_user_id === $actor->id ? 'outgoing' : 'incoming',
                    'startedAt' => $call->created_at?->toIso8601String(),
                    'answeredAt' => $call->answered_at?->toIso8601String(),
                    'endedAt' => $call->ended_at?->toIso8601String(),
                    'endedReason' => $call->ended_reason,
                    'durationSeconds' => $call->answered_at && $call->ended_at ? $call->answered_at->diffInSeconds($call->ended_at) : null,
                ]),
        ]]);
    }

    public function send(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $data = $request->validate(['body' => 'required|string|max:12000', 'commandId' => 'required|string|max:100']);
        $actor = $request->user();
        abort_unless($actor instanceof User, 401);
        $participants = $this->access->requireParticipant($serviceJob, $actor);
        abort_if($this->access->blocked($participants), 409, 'Messaging is unavailable because one participant blocked the other.');
        $pendingDirectRequest = $serviceJob->direct_provider_profile_id !== null && in_array($serviceJob->status, ['posted', 'offers_received'], true);
        abort_unless($pendingDirectRequest || in_array($serviceJob->status, ['provider_selected', 'provider_traveling', 'working', 'completion_submitted'], true), 409, 'Messaging is unavailable in this job state.');
        $message = DB::transaction(function () use ($serviceJob, $actor, $data, $participants) {
            $conversation = JobConversation::query()->firstOrCreate(['service_job_id' => $serviceJob->id], ['id' => (string) Str::uuid()]);
            $existing = ConversationMessage::query()->where('sender_user_id', $actor->id)->where('client_command_id', $data['commandId'])->first();
            if ($existing) {
                return $existing;
            }
            $conversation = JobConversation::query()->lockForUpdate()->findOrFail($conversation->id);
            $sequence = $conversation->version + 1;
            $message = $conversation->messages()->create(['id' => (string) Str::uuid(), 'sender_user_id' => $actor->id, 'sequence' => $sequence, 'body_ciphertext' => Crypt::encryptString($data['body']), 'encryption_key_version' => (int) config('app.message_key_version', 1), 'client_command_id' => $data['commandId']]);
            $conversation->update(['version' => $sequence]);
            $recipient = $actor->id === $participants['clientId'] ? $participants['providerId'] : $participants['clientId'];
            $this->outbox->record('message.created', 'job_conversation', $conversation->id, $sequence, ['rooms' => ["user:$recipient", "user:{$actor->id}"], 'jobId' => $serviceJob->id, 'conversationId' => $conversation->id, 'messageId' => $message->id, 'sequence' => $sequence]);
            $this->notifications->send($recipient, 'message.created', "New message from {$actor->name}", 'Open the job conversation to reply.', 'service_job', $serviceJob->id, ['jobId' => $serviceJob->id, 'conversationId' => $conversation->id], 'message');

            return $message;
        });

        return response()->json(['data' => ['id' => $message->id, 'sequence' => $message->sequence]], 201);
    }

    public function read(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $data = $request->validate(['sequence' => 'required|integer|min:0']);
        $actor = $request->user();
        abort_unless($actor instanceof User, 401);
        $participants = $this->access->requireParticipant($serviceJob, $actor);
        $conversation = JobConversation::query()->where('service_job_id', $serviceJob->id)->firstOrFail();
        abort_if($data['sequence'] > $conversation->version, 422);
        DB::transaction(function () use ($conversation, $actor, $data, $serviceJob, $participants): void {
            DB::table('conversation_reads')->upsert([['conversation_id' => $conversation->id, 'user_id' => $actor->id, 'last_read_sequence' => $data['sequence'], 'read_at' => now()]], ['conversation_id', 'user_id'], ['last_read_sequence', 'read_at']);
            $this->outbox->record('message.read', 'job_conversation', $conversation->id, (int) $data['sequence'], [
                'rooms' => ["user:{$participants['clientId']}", "user:{$participants['providerId']}"],
                'jobId' => $serviceJob->id,
                'conversationId' => $conversation->id,
                'readerUserId' => $actor->id,
                'lastReadSequence' => $data['sequence'],
            ]);
        });

        return response()->json(['data' => ['lastReadSequence' => $data['sequence']]]);
    }

    public function typing(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $data = $request->validate(['active' => 'required|boolean']);
        $actor = $request->user();
        abort_unless($actor instanceof User, 401);
        $participants = $this->access->requireParticipant($serviceJob, $actor);
        abort_if($this->access->blocked($participants), 409);
        $recipient = $actor->id === $participants['clientId'] ? $participants['providerId'] : $participants['clientId'];
        DB::transaction(fn () => $this->outbox->record('conversation.typing.changed', 'service_job', $serviceJob->id, (int) now()->format('U'), ['rooms' => ["user:$recipient"], 'jobId' => $serviceJob->id, 'actorUserId' => $actor->id, 'active' => $data['active']]));

        return response()->json(['data' => ['active' => $data['active']]]);
    }

    public function react(Request $request, ConversationMessage $conversationMessage): JsonResponse
    {
        $data = $request->validate(['reaction' => ['required', Rule::in(self::ALLOWED_REACTIONS)]]);
        $actor = $request->user();
        abort_unless($actor instanceof User, 401);
        $conversation = JobConversation::query()->findOrFail($conversationMessage->conversation_id);
        $job = ServiceJob::query()->findOrFail($conversation->service_job_id);
        $participants = $this->access->requireParticipant($job, $actor);
        $key = ['message_id' => $conversationMessage->id, 'user_id' => $actor->id, 'reaction' => $data['reaction']];
        $active = DB::transaction(function () use ($key, $job, $conversation, $conversationMessage, $actor, $data, $participants): bool {
            $existing = DB::table('message_reactions')->where($key)->exists();
            if ($existing) {
                DB::table('message_reactions')->where($key)->delete();
            } else {
                DB::table('message_reactions')->insert($key + ['created_at' => now(), 'updated_at' => now()]);
            }
            $this->outbox->record('message.reacted', 'job_conversation', $conversation->id, (int) now()->format('U'), [
                'rooms' => ["user:{$participants['clientId']}", "user:{$participants['providerId']}"],
                'jobId' => $job->id,
                'conversationId' => $conversation->id,
                'messageId' => $conversationMessage->id,
                'actorUserId' => $actor->id,
                'reaction' => $data['reaction'],
                'active' => ! $existing,
            ]);

            return ! $existing;
        });

        return response()->json(['data' => ['reaction' => $data['reaction'], 'active' => $active]]);
    }
}
