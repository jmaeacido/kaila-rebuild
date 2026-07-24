<?php

namespace App\Http\Controllers;

use App\Models\ProfileAsset;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProfileAssetController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['purpose' => ['required', Rule::in(['avatar', 'portfolio', 'credential'])], 'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:10240'], 'caption' => ['nullable', 'string', 'max:180']]);
        /** @var User $user */ $user = $request->user();
        $file = $data['file'];
        $disk = (string) config('filesystems.private_assets_disk');
        $id = (string) Str::uuid();
        $extension = $file->guessExtension() ?: 'bin';
        $key = "profiles/{$user->id}/{$data['purpose']}/{$id}.{$extension}";
        Storage::disk($disk)->putFileAs(dirname($key), $file, basename($key));
        $asset = ProfileAsset::query()->create(['id' => $id, 'user_id' => $user->id, 'purpose' => $data['purpose'], 'disk' => $disk, 'object_key' => $key,
            'original_name' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType() ?? 'application/octet-stream', 'size_bytes' => $file->getSize(), 'scan_status' => 'pending', 'caption' => $data['caption'] ?? null]);

        return response()->json(['data' => $asset->only(['id', 'purpose', 'original_name', 'scan_status', 'caption'])], 201);
    }

    public function show(Request $request, ProfileAsset $profileAsset): StreamedResponse
    {
        /** @var User|null $user */ $user = $request->user();
        abort_unless(($user !== null && $profileAsset->user_id === $user->id) || ($profileAsset->purpose === 'portfolio' && $profileAsset->scan_status === 'clean'), 403);
        abort_unless($profileAsset->scan_status === 'clean', 409, 'The file is not available until its safety scan passes.');

        return Storage::disk($profileAsset->disk)->response(
            $profileAsset->object_key,
            $profileAsset->original_name,
            [
                'Content-Type' => $profileAsset->mime_type,
                'Cache-Control' => 'private, max-age=300',
                'X-Content-Type-Options' => 'nosniff',
            ],
        );
    }
}
