<?php

namespace App\Http\Controllers;

use App\Jobs\ScanJobAsset;
use App\Models\JobAsset;
use App\Models\JobOpportunity;
use App\Models\ProviderProfile;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\HiredJobAccess;
use App\Support\JobRealtimePublisher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File;
use Symfony\Component\HttpFoundation\StreamedResponse;

class JobAssetController
{
    public function __construct(private readonly HiredJobAccess $access, private readonly JobRealtimePublisher $realtime) {}

    public function store(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_unless($serviceJob->client_user_id === $user->id, 404);
        $this->requireEditable($serviceJob);
        $request->validate(['file' => ['required', File::types(['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'mov'])->max(10 * 1024)]]);
        abort_if($serviceJob->assets()->count() >= 5, 422, 'A job can have at most five attachments.');
        $file = $request->file('file');
        $id = (string) Str::uuid();
        $key = "jobs/{$serviceJob->id}/{$id}.{$file->extension()}";
        $disk = (string) config('filesystems.private_assets_disk');
        Storage::disk($disk)->putFileAs("jobs/{$serviceJob->id}", $file, "{$id}.{$file->extension()}");
        $asset = DB::transaction(function () use ($id, $serviceJob, $user, $disk, $key, $file): JobAsset {
            $asset = JobAsset::query()->create(['id' => $id, 'service_job_id' => $serviceJob->id, 'user_id' => $user->id, 'disk' => $disk, 'object_key' => $key, 'original_name' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType() ?: 'application/octet-stream', 'size_bytes' => $file->getSize(), 'scan_status' => 'pending']);
            $this->realtime->record('job.media.updated', $serviceJob, 'job_asset', $asset->id, 1, ['scanStatus' => 'pending']);

            return $asset;
        });
        ScanJobAsset::dispatch($asset->id);

        return response()->json(['data' => $asset->only(['id', 'original_name', 'mime_type', 'size_bytes', 'scan_status'])], 201);
    }

    public function destroy(Request $request, JobAsset $jobAsset): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $job = ServiceJob::query()->findOrFail($jobAsset->service_job_id);
        abort_unless($job->client_user_id === $user->id, 404);
        $this->requireEditable($job);

        DB::transaction(function () use ($job, $jobAsset): void {
            $this->realtime->record('job.media.updated', $job, 'job_asset', $jobAsset->id, 2, ['deleted' => true]);
            $jobAsset->delete();
        });
        Storage::disk($jobAsset->disk)->delete($jobAsset->object_key);

        return response()->json(['data' => ['id' => $jobAsset->id, 'deleted' => true]]);
    }

    public function show(Request $request, JobAsset $jobAsset): StreamedResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $job = ServiceJob::query()->findOrFail($jobAsset->service_job_id);
        if ($job->client_user_id !== $user->id) {
            $provider = ProviderProfile::query()->where('user_id', $user->id)->first();
            $hasVisibleOpportunity = $provider && JobOpportunity::query()
                ->where('service_job_id', $job->id)
                ->where('provider_profile_id', $provider->id)
                ->whereIn('state', ['new', 'seen', 'offered'])
                ->exists();

            if (! $hasVisibleOpportunity) {
                $this->access->requireParticipant($job, $user);
            }
        }
        abort_unless($jobAsset->scan_status === 'clean', 404);

        return Storage::disk($jobAsset->disk)->response(
            $jobAsset->object_key,
            $jobAsset->original_name,
            ['Content-Type' => $jobAsset->mime_type],
        );
    }

    private function requireEditable(ServiceJob $job): void
    {
        $editable = $job->status === 'draft'
            || ($job->status === 'posted' && ! $job->offers()->exists());
        abort_unless($editable, 409, 'Job media can no longer be changed because an offer or work agreement already exists.');
    }
}
