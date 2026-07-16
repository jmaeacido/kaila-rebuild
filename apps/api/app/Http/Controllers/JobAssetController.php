<?php

namespace App\Http\Controllers;

use App\Models\JobAsset;
use App\Models\ServiceJob;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File;

class JobAssetController
{
    public function store(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_unless($serviceJob->client_user_id === $user->id, 404);
        abort_unless($serviceJob->status === 'draft', 409);
        $request->validate(['file' => ['required', File::types(['jpg', 'jpeg', 'png', 'webp'])->max(8 * 1024)]]);
        abort_if($serviceJob->assets()->count() >= 5, 422, 'A job can have at most five attachments.');
        $file = $request->file('file');
        $id = (string) Str::uuid();
        $key = "jobs/{$serviceJob->id}/{$id}.{$file->extension()}";
        $disk = (string) config('filesystems.private_assets_disk');
        Storage::disk($disk)->putFileAs("jobs/{$serviceJob->id}", $file, "{$id}.{$file->extension()}");
        $asset = JobAsset::query()->create(['id' => $id, 'service_job_id' => $serviceJob->id, 'user_id' => $user->id, 'disk' => $disk, 'object_key' => $key, 'original_name' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType() ?: 'application/octet-stream', 'size_bytes' => $file->getSize(), 'scan_status' => 'pending']);

        return response()->json(['data' => $asset->only(['id', 'original_name', 'mime_type', 'size_bytes', 'scan_status'])], 201);
    }
}
