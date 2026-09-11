<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;

class IdentityImageValidator
{
    private const ALLOWED_MIMES = [
        'image/jpeg' => ["\xFF\xD8\xFF"],
        'image/png' => ["\x89PNG\r\n\x1A\n"],
        'image/webp' => ['RIFF'],
    ];

    /** @return array{mime: string, bytes: string} */
    public function validateAndRead(UploadedFile $file, int $maxKilobytes): array
    {
        abort_if($file->getSize() === false || $file->getSize() > $maxKilobytes * 1024, 422, 'The image exceeds the maximum allowed size.');
        $extension = strtolower((string) $file->getClientOriginalExtension());
        abort_if(in_array($extension, ['svg', 'html', 'htm', 'js', 'exe', 'php', 'phtml', 'sh', 'bat', 'cmd', 'dll'], true), 422, 'Unsupported file type.');
        $path = $file->getRealPath();
        abort_if($path === false, 422, 'The upload could not be read.');
        $bytes = file_get_contents($path);
        abort_if($bytes === false || $bytes === '', 422, 'The upload could not be read.');
        abort_if($this->looksLikeMarkupOrScript($bytes), 422, 'Unsupported or unsafe image content.');
        $mime = $this->detectMime($bytes);
        abort_if($mime === null, 422, 'The file signature is not an accepted image type.');
        $clientMime = strtolower((string) $file->getMimeType());
        abort_unless(str_starts_with($clientMime, 'image/'), 422, 'The declared MIME type is not an image.');
        abort_if(in_array($clientMime, ['image/svg+xml', 'text/html', 'application/xhtml+xml'], true), 422, 'Unsupported MIME type.');

        return ['mime' => $mime, 'bytes' => $bytes];
    }

    private function detectMime(string $bytes): ?string
    {
        foreach (self::ALLOWED_MIMES as $mime => $signatures) {
            foreach ($signatures as $signature) {
                if (str_starts_with($bytes, $signature)) {
                    if ($mime === 'image/webp') {
                        return str_contains(substr($bytes, 0, 16), 'WEBP') ? $mime : null;
                    }

                    return $mime;
                }
            }
        }

        return null;
    }

    private function looksLikeMarkupOrScript(string $bytes): bool
    {
        $head = strtolower(substr($bytes, 0, 512));

        return str_contains($head, '<svg')
            || str_contains($head, '<html')
            || str_contains($head, '<!doctype')
            || str_contains($head, '<?php')
            || str_contains($head, '<script');
    }
}
