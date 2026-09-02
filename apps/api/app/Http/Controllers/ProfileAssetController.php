<?php

namespace App\Http\Controllers;

use App\Models\ProfileAsset;
use App\Models\User;
use App\Support\AdminNotificationService;
use App\Support\OutboxRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProfileAssetController extends Controller
{
    public function __construct(
        private readonly OutboxRecorder $outbox,
        private readonly AdminNotificationService $adminNotifications,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'purpose' => ['required', Rule::in(['avatar', 'portfolio', 'credential'])],
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:10240'],
            'caption' => ['nullable', 'string', 'max:180'],
        ]);
        if ($data['purpose'] === 'portfolio') {
            $request->validate(['file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240']]);
        }
        /** @var User $user */ $user = $request->user();
        if ($data['purpose'] === 'portfolio') {
            $portfolioCount = ProfileAsset::query()->where('user_id', $user->id)->where('purpose', 'portfolio')->count();
            abort_if($portfolioCount >= 12, 422, 'You can feature up to 12 work photos on your profile.');
        }
        $file = $data['file'];
        $disk = (string) config('filesystems.private_assets_disk');
        $id = (string) Str::uuid();
        $extension = $file->guessExtension() ?: 'bin';
        $key = "profiles/{$user->id}/{$data['purpose']}/{$id}.{$extension}";
        Storage::disk($disk)->putFileAs(dirname($key), $file, basename($key));
        $asset = DB::transaction(function () use ($id, $user, $data, $disk, $key, $file): ProfileAsset {
            $sortOrder = 0;
            if ($data['purpose'] === 'portfolio') {
                $sortOrder = (int) ProfileAsset::query()
                    ->where('user_id', $user->id)
                    ->where('purpose', 'portfolio')
                    ->max('sort_order') + 1;
            }
            $asset = ProfileAsset::query()->create(['id' => $id, 'user_id' => $user->id, 'purpose' => $data['purpose'], 'disk' => $disk, 'object_key' => $key,
                'original_name' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType() ?? 'application/octet-stream', 'size_bytes' => $file->getSize(), 'scan_status' => 'pending', 'caption' => $data['caption'] ?? null, 'sort_order' => $sortOrder]);
            $this->outbox->record('profile.media.updated', 'profile_asset', $asset->id, 1, [
                'rooms' => ["user:{$user->id}"],
                'profileAssetId' => $asset->id,
                'purpose' => $asset->purpose,
                'scanStatus' => $asset->scan_status,
            ]);

            return $asset;
        });
        $this->adminNotifications->send(
            'admin.review.asset_submitted',
            'File needs review',
            "{$user->name} uploaded a {$asset->purpose} file.",
            'profile_asset',
            (string) $asset->id,
            ['profileAssetId' => $asset->id],
        );

        return response()->json(['data' => $asset->only(['id', 'purpose', 'original_name', 'scan_status', 'caption'])], 201);
    }

    public function show(Request $request, ProfileAsset $profileAsset): StreamedResponse
    {
        /** @var User|null $user */ $user = $request->user();
        $isOwner = $user !== null && $profileAsset->user_id === $user->id;
        abort_unless(
            $isOwner
            || (in_array($profileAsset->purpose, ['avatar', 'portfolio'], true) && $profileAsset->scan_status === 'clean'),
            403
        );

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

    public function update(Request $request, ProfileAsset $profileAsset): JsonResponse
    {
        /** @var User $user */ $user = $request->user();
        abort_unless($profileAsset->user_id === $user->id && $profileAsset->purpose === 'portfolio', 403);
        $data = $request->validate(['caption' => ['nullable', 'string', 'max:180']]);
        $profileAsset->update(['caption' => $data['caption'] ?? null]);

        return response()->json(['data' => $this->presentOwnedAsset($profileAsset)]);
    }

    public function destroy(Request $request, ProfileAsset $profileAsset): JsonResponse
    {
        /** @var User $user */ $user = $request->user();
        abort_unless($profileAsset->user_id === $user->id && $profileAsset->purpose === 'portfolio', 403);
        DB::transaction(function () use ($profileAsset, $user): void {
            Storage::disk($profileAsset->disk)->delete($profileAsset->object_key);
            $profileAsset->delete();
            $this->outbox->record('profile.media.updated', 'profile_asset', (string) Str::uuid(), 1, [
                'rooms' => ["user:{$user->id}"],
                'purpose' => 'portfolio',
                'scanStatus' => 'deleted',
            ]);
        });

        return response()->json(['data' => ['id' => $profileAsset->id, 'deleted' => true]]);
    }

    public function like(Request $request, ProfileAsset $profileAsset): JsonResponse
    {
        /** @var User $user */ $user = $request->user();
        abort_unless($profileAsset->purpose === 'portfolio' && $profileAsset->scan_status === 'clean', 404);
        abort_if($profileAsset->user_id === $user->id, 422, 'You cannot like your own work photo.');

        DB::table('profile_asset_reactions')->updateOrInsert(
            ['profile_asset_id' => $profileAsset->id, 'user_id' => $user->id],
            ['reaction' => 'heart', 'created_at' => now(), 'updated_at' => now()],
        );
        $likeCount = DB::table('profile_asset_reactions')->where('profile_asset_id', $profileAsset->id)->count();
        $profileAsset->update(['like_count' => $likeCount]);

        return response()->json(['data' => ['liked' => true, 'likeCount' => $likeCount]]);
    }

    public function unlike(Request $request, ProfileAsset $profileAsset): JsonResponse
    {
        /** @var User $user */ $user = $request->user();
        abort_unless($profileAsset->purpose === 'portfolio' && $profileAsset->scan_status === 'clean', 404);

        DB::table('profile_asset_reactions')
            ->where(['profile_asset_id' => $profileAsset->id, 'user_id' => $user->id])
            ->delete();
        $likeCount = DB::table('profile_asset_reactions')->where('profile_asset_id', $profileAsset->id)->count();
        $profileAsset->update(['like_count' => $likeCount]);

        return response()->json(['data' => ['liked' => false, 'likeCount' => $likeCount]]);
    }

    /** @return array<string, mixed> */
    private function presentOwnedAsset(ProfileAsset $asset): array
    {
        return [
            'id' => $asset->id,
            'purpose' => $asset->purpose,
            'caption' => $asset->caption,
            'scanStatus' => $asset->scan_status,
            'downloadPath' => "/api/v1/profile-assets/{$asset->id}",
            'sortOrder' => (int) $asset->sort_order,
        ];
    }
}
