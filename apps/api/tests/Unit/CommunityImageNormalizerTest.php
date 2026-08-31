<?php

namespace Tests\Unit;

use App\Support\CommunityImageNormalizer;
use PHPUnit\Framework\TestCase;

class CommunityImageNormalizerTest extends TestCase
{
    public function test_it_converts_images_to_webp_with_a_standard_mime_type(): void
    {
        if (! function_exists('imagewebp')) {
            $this->markTestSkipped('WebP support is required.');
        }

        $source = imagecreatetruecolor(32, 32);
        ob_start();
        imagepng($source);
        $png = ob_get_clean();
        imagedestroy($source);

        $normalizer = new CommunityImageNormalizer;
        $result = $normalizer->normalize($png);

        $this->assertSame('image/webp', $result['mimeType']);
        $this->assertSame(32, $result['width']);
        $this->assertSame(32, $result['height']);
        $this->assertNotSame('', $result['contents']);
        $this->assertSame('RIFF', substr($result['contents'], 0, 4));
    }

    public function test_it_downscales_large_images(): void
    {
        if (! function_exists('imagewebp')) {
            $this->markTestSkipped('WebP support is required.');
        }

        $source = imagecreatetruecolor(3000, 1500);
        ob_start();
        imagepng($source);
        $png = ob_get_clean();
        imagedestroy($source);

        $normalizer = new CommunityImageNormalizer;
        $result = $normalizer->normalize($png);

        $this->assertSame(CommunityImageNormalizer::MAX_EDGE, $result['width']);
        $this->assertSame(1024, $result['height']);
    }
}
