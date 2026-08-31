<?php

namespace App\Support;

use RuntimeException;

final class CommunityImageNormalizer
{
    public const MAX_EDGE = 2048;

    public const WEBP_QUALITY = 85;

    /** @return array{contents: string, width: int, height: int, mimeType: string} */
    public function normalize(string $contents): array
    {
        if (! function_exists('imagewebp')) {
            throw new RuntimeException('WebP support is required to publish community images.');
        }

        $image = @imagecreatefromstring($contents);
        if ($image === false) {
            throw new RuntimeException('The uploaded community image could not be decoded.');
        }

        $width = imagesx($image);
        $height = imagesy($image);
        if ($width < 1 || $height < 1) {
            imagedestroy($image);
            throw new RuntimeException('The uploaded community image dimensions were invalid.');
        }

        if ($width > self::MAX_EDGE || $height > self::MAX_EDGE) {
            $scale = min(self::MAX_EDGE / $width, self::MAX_EDGE / $height);
            $targetWidth = max(1, (int) round($width * $scale));
            $targetHeight = max(1, (int) round($height * $scale));
            $resized = imagecreatetruecolor($targetWidth, $targetHeight);
            if ($resized === false) {
                imagedestroy($image);
                throw new RuntimeException('The uploaded community image could not be resized.');
            }

            imagealphablending($resized, false);
            imagesavealpha($resized, true);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);
            imagedestroy($image);
            $image = $resized;
            $width = $targetWidth;
            $height = $targetHeight;
        }

        imagealphablending($image, true);
        imagesavealpha($image, true);

        ob_start();
        $encoded = imagewebp($image, null, self::WEBP_QUALITY);
        $normalized = ob_get_clean();
        imagedestroy($image);

        if (! $encoded || ! is_string($normalized) || $normalized === '') {
            throw new RuntimeException('The uploaded community image could not be optimized.');
        }

        return [
            'contents' => $normalized,
            'width' => $width,
            'height' => $height,
            'mimeType' => 'image/webp',
        ];
    }
}
