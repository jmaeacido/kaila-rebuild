<?php

namespace App\Jobs;

use App\Contracts\MalwareScanner;
use App\Models\CommunityPost;
use App\Models\CommunityPostMedia;
use App\Models\User;
use App\Support\CommunityImageNormalizer;
use App\Support\CommunityMediaObjectKey;
use App\Support\CommunityRealtimePublisher;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class ScanCommunityPostMedia implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public int $timeout = 60;

    public int $uniqueFor = 600;

    public function __construct(public readonly string $assetId)
    {
        $this->onQueue('maintenance');
    }

    /** @return list<int> */
    public function backoff(): array
    {
        return [5, 30, 120, 300];
    }

    public function uniqueId(): string
    {
        return $this->assetId;
    }

    public function handle(MalwareScanner $scanner, CommunityImageNormalizer $normalizer): void
    {
        $asset = CommunityPostMedia::query()->findOrFail($this->assetId);
        if (! in_array($asset->scan_status, ['pending', 'failed'], true)) {
            return;
        }

        $contents = Storage::disk($asset->disk)->get($asset->object_key);
        if ($contents === '') {
            throw new RuntimeException('The quarantined community image could not be opened.');
        }

        $stream = fopen('php://memory', 'r+');
        if ($stream === false) {
            throw new RuntimeException('The quarantined community image could not be opened.');
        }

        try {
            fwrite($stream, $contents);
            rewind($stream);
            $result = $scanner->scan($stream);
        } finally {
            fclose($stream);
        }

        if (! $result->clean) {
            DB::transaction(function () use ($asset, $result): void {
                Storage::disk($asset->disk)->delete($asset->object_key);
                $asset->update([
                    'scan_status' => 'rejected',
                    'scan_signature' => $result->signature,
                    'scan_error' => null,
                    'scanned_at' => now(),
                ]);
                $this->recordUpdate($asset);
            });

            return;
        }

        $normalized = $normalizer->normalize($contents);
        $publishedKey = CommunityMediaObjectKey::published($asset->community_post_id, $asset->id);

        DB::transaction(function () use ($asset, $normalized, $publishedKey, $result): void {
            Storage::disk($asset->disk)->put($publishedKey, $normalized['contents']);
            Storage::disk($asset->disk)->delete($asset->object_key);
            $asset->update([
                'object_key' => $publishedKey,
                'original_name' => CommunityMediaObjectKey::displayName($asset->id),
                'mime_type' => $normalized['mimeType'],
                'size_bytes' => strlen($normalized['contents']),
                'scan_status' => 'clean',
                'scan_signature' => $result->signature,
                'scan_error' => null,
                'scanned_at' => now(),
            ]);
            $this->recordUpdate($asset);
        });
    }

    public function failed(?Throwable $exception): void
    {
        CommunityPostMedia::query()->whereKey($this->assetId)->update([
            'scan_status' => 'failed',
            'scan_error' => mb_substr($exception?->getMessage() ?? 'Malware scan failed.', 0, 500),
        ]);
    }

    private function recordUpdate(CommunityPostMedia $asset): void
    {
        $post = CommunityPost::query()->findOrFail($asset->community_post_id);
        $actor = User::query()->findOrFail($asset->user_id);

        app(CommunityRealtimePublisher::class)->publish(
            'community.post.updated',
            $post,
            $actor,
            ['action' => 'media_updated', 'mediaId' => $asset->id],
        );
    }
}
