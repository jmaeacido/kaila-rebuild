<?php

namespace App\Http\Controllers;

use App\Models\ConversationMessage;
use App\Models\JobConversation;
use App\Models\ProfileAsset;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\HiredJobAccess;
use App\Support\OutboxRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ConversationController extends Controller
{
    public function __construct(private readonly HiredJobAccess $access, private readonly OutboxRecorder $outbox) {}

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
        ]]);
    }

    public function send(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $data = $request->validate(['body' => 'required|string|max:12000', 'commandId' => 'required|string|max:100']);
        $actor = $request->user();
        abort_unless($actor instanceof User, 401);
        $participants = $this->access->requireParticipant($serviceJob, $actor);
        abort_if($this->access->blocked($participants), 409, 'Messaging is unavailable because one participant blocked the other.');
        abort_unless(in_array($serviceJob->status, ['provider_selected', 'provider_traveling', 'working', 'completion_submitted'], true), 409, 'Messaging is unavailable in this job state.');
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

            return $message;
        });

        return response()->json(['data' => ['id' => $message->id, 'sequence' => $message->sequence]], 201);
    }

    public function read(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $data = $request->validate(['sequence' => 'required|integer|min:0']);
        $actor = $request->user();
        abort_unless($actor instanceof User, 401);
        $this->access->requireParticipant($serviceJob, $actor);
        $conversation = JobConversation::query()->where('service_job_id', $serviceJob->id)->firstOrFail();
        abort_if($data['sequence'] > $conversation->version, 422);
        DB::table('conversation_reads')->upsert([['conversation_id' => $conversation->id, 'user_id' => $actor->id, 'last_read_sequence' => $data['sequence'], 'read_at' => now()]], ['conversation_id', 'user_id'], ['last_read_sequence', 'read_at']);

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
        $data = $request->validate(['reaction' => 'required|in:👍,❤️,😂,😮,😢,🙏']);
        $actor = $request->user();
        abort_unless($actor instanceof User, 401);
        $conversation = JobConversation::query()->findOrFail($conversationMessage->conversation_id);
        $job = ServiceJob::query()->findOrFail($conversation->service_job_id);
        $this->access->requireParticipant($job, $actor);
        $key = ['message_id' => $conversationMessage->id, 'user_id' => $actor->id, 'reaction' => $data['reaction']];
        $existing = DB::table('message_reactions')->where($key)->exists();
        if ($existing) {
            DB::table('message_reactions')->where($key)->delete();
        } else {
            DB::table('message_reactions')->insert($key + ['created_at' => now(), 'updated_at' => now()]);
        }

        return response()->json(['data' => ['reaction' => $data['reaction'], 'active' => ! $existing]]);
    }
}
