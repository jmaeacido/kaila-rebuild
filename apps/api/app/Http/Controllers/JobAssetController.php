<?php

namespace App\Http\Controllers;

use App\Jobs\ScanJobAsset;
use App\Models\JobAsset;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\HiredJobAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File;
use Symfony\Component\HttpFoundation\StreamedResponse;

class JobAssetController
{
    public function __construct(private readonly HiredJobAccess $access) {}

    public function store(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_unless($serviceJob->client_user_id === $user->id, 404);
        abort_unless($serviceJob->status === 'draft', 409);
        $request->validate(['file' => ['required', File::types(['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'mov'])->max(10 * 1024)]]);
        abort_if($serviceJob->assets()->count() >= 5, 422, 'A job can have at most five attachments.');
        $file = $request->file('file');
        $id = (string) Str::uuid();
        $key = "jobs/{$serviceJob->id}/{$id}.{$file->extension()}";
        $disk = (string) config('filesystems.private_assets_disk');
        Storage::disk($disk)->putFileAs("jobs/{$serviceJob->id}", $file, "{$id}.{$file->extension()}");
        $asset = JobAsset::query()->create(['id' => $id, 'service_job_id' => $serviceJob->id, 'user_id' => $user->id, 'disk' => $disk, 'object_key' => $key, 'original_name' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType() ?: 'application/octet-stream', 'size_bytes' => $file->getSize(), 'scan_status' => 'pending']);
        ScanJobAsset::dispatch($asset->id);

        return response()->json(['data' => $asset->only(['id', 'original_name', 'mime_type', 'size_bytes', 'scan_status'])], 201);
    }

    public function show(Request $request, JobAsset $jobAsset): StreamedResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $job = ServiceJob::query()->findOrFail($jobAsset->service_job_id);
        if ($job->client_user_id !== $user->id) {
            $this->access->requireParticipant($job, $user);
        }
        abort_unless($jobAsset->scan_status === 'clean', 404);

        return Storage::disk($jobAsset->disk)->response(
            $jobAsset->object_key,
            $jobAsset->original_name,
            ['Content-Type' => $jobAsset->mime_type],
        );
    }
}
