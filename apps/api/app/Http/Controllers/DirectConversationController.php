<?php

namespace App\Http\Controllers;

use App\Models\DirectConversation;
use App\Models\DirectMessage;
use App\Models\User;
use App\Support\OutboxRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DirectConversationController
{
    public function __construct(private readonly OutboxRecorder $outbox) {}

    public function index(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $rows = DirectConversation::query()
            ->where(fn ($query) => $query->where('lower_user_id', $user->id)->orWhere('higher_user_id', $user->id))
            ->latest('updated_at')->limit(100)->get()->map(fn (DirectConversation $conversation) => $this->present($conversation, $user));

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless(config('phase_nine.enabled') && config('phase_nine.direct_messages'), 404);
        $data = $request->validate(['recipientUserId' => 'required|integer|exists:users,id']);
        $actor = $this->user($request);
        $recipientId = (int) $data['recipientUserId'];
        abort_if($actor->id === $recipientId, 422, 'Choose another person.');
        $ids = [$actor->id, $recipientId];
        sort($ids);
        abort_if(DB::table('user_blocks')->where(fn ($query) => $query->where('blocker_user_id', $ids[0])->where('blocked_user_id', $ids[1]))->orWhere(fn ($query) => $query->where('blocker_user_id', $ids[1])->where('blocked_user_id', $ids[0]))->exists(), 409, 'Messaging is unavailable.');
        $conversation = DirectConversation::query()->firstOrCreate(
            ['lower_user_id' => $ids[0], 'higher_user_id' => $ids[1]],
            ['id' => (string) Str::uuid(), 'requested_by_user_id' => $actor->id, 'status' => 'pending'],
        );

        return response()->json(['data' => $this->present($conversation, $actor)], $conversation->wasRecentlyCreated ? 201 : 200);
    }

    public function accept(Request $request, DirectConversation $directConversation): JsonResponse
    {
        $actor = $this->participant($request, $directConversation);
        abort_unless($directConversation->requested_by_user_id !== $actor->id, 409, 'The recipient must accept this request.');
        abort_unless($directConversation->status === 'pending', 409);
        $directConversation->update(['status' => 'accepted', 'accepted_at' => now()]);

        return response()->json(['data' => $this->present($directConversation, $actor)]);
    }

    public function show(Request $request, DirectConversation $directConversation): JsonResponse
    {
        $actor = $this->participant($request, $directConversation);
        $messages = $directConversation->messages()->orderByDesc('sequence')->limit(50)->get()->reverse()->values()->map(fn (DirectMessage $message) => [
            'id' => $message->id, 'sequence' => $message->sequence, 'senderUserId' => $message->sender_user_id,
            'body' => Crypt::decryptString($message->body_ciphertext), 'createdAt' => $message->created_at?->toIso8601String(),
        ]);

        return response()->json(['data' => [...$this->present($directConversation, $actor), 'messages' => $messages]]);
    }

    public function send(Request $request, DirectConversation $directConversation): JsonResponse
    {
        $data = $request->validate(['body' => 'required|string|max:12000', 'commandId' => 'required|string|max:100']);
        $actor = $this->participant($request, $directConversation);
        abort_unless($directConversation->status === 'accepted', 409, 'The message request must be accepted first.');
        $otherId = $directConversation->lower_user_id === $actor->id ? $directConversation->higher_user_id : $directConversation->lower_user_id;
        abort_if(DB::table('user_blocks')->where(fn ($query) => $query->where('blocker_user_id', $actor->id)->where('blocked_user_id', $otherId))->orWhere(fn ($query) => $query->where('blocker_user_id', $otherId)->where('blocked_user_id', $actor->id))->exists(), 409, 'Messaging is unavailable.');
        $message = DB::transaction(function () use ($directConversation, $actor, $otherId, $data) {
            $existing = DirectMessage::query()->where('sender_user_id', $actor->id)->where('client_command_id', $data['commandId'])->first();
            if ($existing) {
                return $existing;
            }
            $locked = DirectConversation::query()->lockForUpdate()->findOrFail($directConversation->id);
            $sequence = $locked->version + 1;
            $message = $locked->messages()->create(['id' => (string) Str::uuid(), 'sender_user_id' => $actor->id, 'sequence' => $sequence, 'body_ciphertext' => Crypt::encryptString($data['body']), 'encryption_key_version' => (int) config('app.message_key_version', 1), 'client_command_id' => $data['commandId']]);
            $locked->update(['version' => $sequence]);
            $this->outbox->record('direct.message.created', 'direct_conversation', $locked->id, $sequence, ['rooms' => ["user:$otherId", "user:{$actor->id}"], 'conversationId' => $locked->id, 'messageId' => $message->id, 'sequence' => $sequence]);

            return $message;
        });

        return response()->json(['data' => ['id' => $message->id, 'sequence' => $message->sequence]], 201);
    }

    private function participant(Request $request, DirectConversation $conversation): User
    {
        $user = $this->user($request);
        abort_unless(in_array($user->id, [$conversation->lower_user_id, $conversation->higher_user_id], true), 404);

        return $user;
    }

    /** @return array<string, mixed> */
    private function present(DirectConversation $conversation, User $viewer): array
    {
        $otherId = $conversation->lower_user_id === $viewer->id ? $conversation->higher_user_id : $conversation->lower_user_id;
        $other = User::query()->findOrFail($otherId);

        return ['id' => $conversation->id, 'status' => $conversation->status, 'version' => $conversation->version, 'otherUser' => ['id' => $other->id, 'name' => $other->name], 'requestedByMe' => $conversation->requested_by_user_id === $viewer->id];
    }

    private function user(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
