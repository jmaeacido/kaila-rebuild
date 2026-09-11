<?php

namespace App\Console\Commands;

use App\Models\ProfileAsset;
use App\Models\ProviderProfile;
use App\Support\ProviderWelcomeCommunityPostService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SeparateProviderAvatars extends Command
{
    protected $signature = 'kaila:separate-provider-avatars {--dry-run : Report changes without writing}';

    protected $description = 'Ensure each provider has an independent provider_avatar so client picture changes do not rewrite provider logos';

    /**
     * Known provider logos that were uploaded as client avatars before purpose separation.
     * Reclassify these instead of cloning the latest client photo.
     *
     * @var array<int, string>
     */
    private const RECLASSIFY_ASSET_BY_USER = [
        5 => '8ea3ca4d-985b-48d6-a5b2-efe809e07c93', // jmhandyservices.png
    ];

    public function handle(ProviderWelcomeCommunityPostService $welcomePosts): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $fixed = 0;
        $skipped = 0;
        $republished = 0;

        $userIds = ProviderProfile::query()->pluck('user_id')->unique()->values();
        foreach ($userIds as $userId) {
            $userId = (int) $userId;
            $hasProviderAvatar = ProfileAsset::query()
                ->where('user_id', $userId)
                ->where('purpose', 'provider_avatar')
                ->whereIn('scan_status', ['pending', 'clean'])
                ->exists();
            if ($hasProviderAvatar) {
                $skipped++;

                continue;
            }

            $overrideId = self::RECLASSIFY_ASSET_BY_USER[$userId] ?? null;
            if ($overrideId) {
                $source = ProfileAsset::query()
                    ->where('user_id', $userId)
                    ->where('id', $overrideId)
                    ->first();
                if (! $source) {
                    $this->warn("User {$userId}: override asset {$overrideId} was not found.");
                    $skipped++;

                    continue;
                }
                $this->line("User {$userId}: reclassify {$source->original_name} ({$source->id}) → provider_avatar");
                if (! $dryRun) {
                    $source->update(['purpose' => 'provider_avatar']);
                }
            } else {
                $source = ProfileAsset::query()
                    ->where('user_id', $userId)
                    ->where('purpose', 'avatar')
                    ->where('scan_status', 'clean')
                    ->orderByRaw("CASE WHEN origin = 'upload' THEN 0 ELSE 1 END")
                    ->latest()
                    ->first();
                if (! $source) {
                    $this->warn("User {$userId}: no clean client avatar to clone.");
                    $skipped++;

                    continue;
                }
                $this->line("User {$userId}: clone {$source->original_name} ({$source->id}) → provider_avatar");
                if (! $dryRun) {
                    $this->cloneAsProviderAvatar($source);
                }
            }

            $fixed++;
            if ($dryRun) {
                continue;
            }

            $profile = ProviderProfile::query()
                ->where('user_id', $userId)
                ->where('status', 'active')
                ->first();
            if ($profile) {
                try {
                    $welcomePosts->publishForProvider($profile);
                    $republished++;
                } catch (\Throwable $exception) {
                    $this->warn("User {$userId}: avatar separated but welcome post republish failed: {$exception->getMessage()}");
                }
            }
        }

        $this->info(($dryRun ? 'Dry run: would fix ' : 'Fixed ').$fixed.' provider(s); skipped '.$skipped.'; republished welcome posts for '.$republished.'.');

        return self::SUCCESS;
    }

    private function cloneAsProviderAvatar(ProfileAsset $source): ProfileAsset
    {
        $id = (string) Str::uuid();
        $extension = pathinfo($source->object_key, PATHINFO_EXTENSION) ?: 'bin';
        $key = "profiles/{$source->user_id}/provider_avatar/{$id}.{$extension}";
        $contents = Storage::disk($source->disk)->get($source->object_key);
        if ($contents === null) {
            throw new \RuntimeException("Failed to read file: {$source->object_key}");
        }
        Storage::disk($source->disk)->put($key, $contents);

        return ProfileAsset::query()->create([
            'id' => $id,
            'user_id' => $source->user_id,
            'purpose' => 'provider_avatar',
            'origin' => $source->origin ?: 'upload',
            'disk' => $source->disk,
            'object_key' => $key,
            'original_name' => $source->original_name,
            'mime_type' => $source->mime_type,
            'size_bytes' => $source->size_bytes,
            'scan_status' => $source->scan_status,
            'reviewed_by' => $source->reviewed_by,
            'review_note' => $source->review_note,
            'reviewed_at' => $source->reviewed_at,
        ]);
    }
}
