<?php

namespace App\Http\Controllers;

use App\Models\ConversationMessage;
use App\Models\JobConversation;
use App\Models\MessageAsset;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\HiredJobAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MessageAssetController extends Controller
{
    public function __construct(private readonly HiredJobAccess $access) {}

    public function store(Request $request, ConversationMessage $conversationMessage): JsonResponse
    {
        $data = $request->validate(['file' => 'required|file|max:10240|mimetypes:image/jpeg,image/png,image/webp,application/pdf']);
        $actor = $request->user();
        abort_unless($actor instanceof User, 401);
        $conversation = JobConversation::query()->findOrFail($conversationMessage->conversation_id);
        $job = ServiceJob::query()->findOrFail($conversation->service_job_id);
        $this->access->requireParticipant($job, $actor);
        abort_unless($conversationMessage->sender_user_id === $actor->id, 404);
        $file = $data['file'];
        $id = (string) Str::uuid();
        $key = "messages/{$conversation->id}/$id";
        Storage::disk((string) config('filesystems.private_assets_disk'))->put($key, $file->getContent());
        DB::table('message_assets')->insert(['id' => $id, 'message_id' => $conversationMessage->id, 'owner_user_id' => $actor->id, 'disk' => config('filesystems.private_assets_disk'), 'object_key' => $key, 'original_name' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType(), 'size_bytes' => $file->getSize(), 'scan_status' => 'pending', 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['data' => ['id' => $id, 'name' => $file->getClientOriginalName(), 'mimeType' => $file->getMimeType(), 'scanStatus' => 'pending']], 201);
    }

    public function show(Request $request, MessageAsset $messageAsset): StreamedResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User, 401);
        $message = ConversationMessage::query()->findOrFail($messageAsset->message_id);
        $conversation = JobConversation::query()->findOrFail($message->conversation_id);
        $job = ServiceJob::query()->findOrFail($conversation->service_job_id);
        $this->access->requireParticipant($job, $actor);
        abort_unless($messageAsset->scan_status === 'clean', 404);

        return Storage::disk($messageAsset->disk)->download($messageAsset->object_key, $messageAsset->original_name, ['Content-Type' => $messageAsset->mime_type]);
    }

    public function review(Request $request, MessageAsset $messageAsset): JsonResponse
    {
        $data = $request->validate(['scanStatus' => 'required|in:clean,rejected']);
        $messageAsset->update(['scan_status' => $data['scanStatus']]);

        return response()->json(['data' => ['id' => $messageAsset->id, 'scanStatus' => $messageAsset->scan_status]]);
    }
}
