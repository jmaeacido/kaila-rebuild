<?php

namespace App\Support;

use App\Models\ProfileAsset;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class SocialAvatarImporter
{
    private const MAX_BYTES = 5 * 1024 * 1024;

    private const MAX_DIMENSION = 4096;

    /** @var array<string, list<string>> */
    private const ALLOWED_HOST_SUFFIXES = [
        'google' => ['googleusercontent.com'],
        'facebook' => ['fbcdn.net', 'fbsbx.com'],
    ];

    public function import(User $user, string $provider, ?string $url): ?ProfileAsset
    {
        if ($url === null || ProfileAsset::query()
            ->where('user_id', $user->getKey())
            ->where('purpose', 'avatar')
            ->where('origin', 'social')
            ->exists()) {
            return null;
        }

        $this->assertAllowedUrl($provider, $url);
        $contents = $this->download($provider, $url);
        [$contents, $width, $height] = $this->sanitize($contents);
        $size = strlen($contents);
        if ($size === 0) {
            throw new RuntimeException('The social avatar failed image validation.');
        }

        $id = (string) Str::uuid();
        $disk = (string) config('filesystems.private_assets_disk');
        $key = "profiles/{$user->getKey()}/avatar/{$id}.webp";
        Storage::disk($disk)->put($key, $contents);

        return ProfileAsset::query()->create([
            'id' => $id,
            'user_id' => $user->getKey(),
            'purpose' => 'avatar',
            'origin' => 'social',
            'disk' => $disk,
            'object_key' => $key,
            'original_name' => "{$provider}-profile-picture.webp",
            'mime_type' => 'image/webp',
            'size_bytes' => $size,
            'scan_status' => 'clean',
            'caption' => "Sanitized {$width}×{$height} social profile picture",
        ]);
    }

    private function download(string $provider, string $url): string
    {
        $currentUrl = $url;
        for ($redirects = 0; $redirects <= 2; $redirects++) {
            $response = Http::timeout(8)
                ->connectTimeout(3)
                ->withOptions(['allow_redirects' => false])
                ->get($currentUrl);

            if ($response->redirect()) {
                $location = $response->header('Location');
                if ($redirects === 2 || $location === '') {
                    throw new RuntimeException('The social avatar had too many redirects.');
                }
                $currentUrl = $this->redirectUrl($currentUrl, $location);
                $this->assertAllowedUrl($provider, $currentUrl);

                continue;
            }

            if (! $response->successful()) {
                throw new RuntimeException('The social avatar could not be downloaded.');
            }

            $mimeType = Str::lower(trim(Str::before((string) $response->header('Content-Type'), ';')));
            if (! in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'], true)) {
                throw new RuntimeException('The social avatar was not a supported image.');
            }

            $contents = $response->body();
            if ($contents === '' || strlen($contents) > self::MAX_BYTES) {
                throw new RuntimeException('The social avatar exceeded the size limit.');
            }

            return $contents;
        }

        throw new RuntimeException('The social avatar could not be downloaded.');
    }

    /** @return array{string, int, int} */
    private function sanitize(string $contents): array
    {
        $dimensions = @getimagesizefromstring($contents);
        $image = @imagecreatefromstring($contents);
        if ($dimensions === false || $image === false) {
            throw new RuntimeException('The social avatar failed image validation.');
        }

        [$width, $height] = $dimensions;
        if ($width < 1 || $height < 1 || $width > self::MAX_DIMENSION || $height > self::MAX_DIMENSION) {
            imagedestroy($image);
            throw new RuntimeException('The social avatar dimensions were invalid.');
        }

        ob_start();
        $encoded = imagewebp($image, null, 85);
        $sanitized = ob_get_clean();
        imagedestroy($image);
        if (! $encoded) {
            throw new RuntimeException('The social avatar could not be sanitized.');
        }

        return [$sanitized, $width, $height];
    }

    private function redirectUrl(string $currentUrl, string $location): string
    {
        if (str_starts_with($location, 'https://')) {
            return $location;
        }

        $parts = parse_url($currentUrl);
        if (! str_starts_with($location, '/') || ! isset($parts['host'])) {
            throw new RuntimeException('The social avatar redirect was invalid.');
        }

        return 'https://'.$parts['host'].$location;
    }

    private function assertAllowedUrl(string $provider, string $url): void
    {
        $parts = parse_url($url);
        $host = Str::lower((string) ($parts['host'] ?? ''));
        $allowed = ($parts['scheme'] ?? null) === 'https'
            && ! isset($parts['user'], $parts['pass'], $parts['port'])
            && collect(self::ALLOWED_HOST_SUFFIXES[$provider] ?? [])->contains(
                fn (string $suffix): bool => $host === $suffix || str_ends_with($host, ".{$suffix}"),
            );

        if (! $allowed) {
            throw new RuntimeException('The social avatar URL was not trusted.');
        }
    }
}
