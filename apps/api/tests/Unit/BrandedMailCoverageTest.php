<?php

namespace Tests\Unit;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SplFileInfo;
use Tests\TestCase;

class BrandedMailCoverageTest extends TestCase
{
    public function test_every_mail_message_uses_branded_html_and_plain_text_views(): void
    {
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(app_path()));
        $mailSenders = [];

        /** @var SplFileInfo $file */
        foreach ($files as $file) {
            if (! $file->isFile() || $file->getExtension() !== 'php') {
                continue;
            }

            $source = (string) file_get_contents($file->getPathname());
            if (! str_contains($source, 'new MailMessage') && ! str_contains($source, 'extends Mailable')) {
                continue;
            }

            $mailSenders[] = $file->getPathname();
            $this->assertMatchesRegularExpression(
                "/(?:->view\('mail\.|view:\s*'mail\.)/",
                $source,
                "{$file->getFilename()} must use a KAILA HTML mail view.",
            );
            $this->assertMatchesRegularExpression(
                "/(?:->text\('mail\.|text:\s*'mail\.)/",
                $source,
                "{$file->getFilename()} must include a branded plain-text alternative.",
            );
        }

        $this->assertCount(4, $mailSenders, 'Review newly added mail senders and update the expected branded sender count.');
    }

    public function test_every_html_mail_view_uses_the_shared_kaila_layout(): void
    {
        $views = glob(resource_path('views/mail/**/*.blade.php')) ?: [];
        $htmlViews = array_values(array_filter($views, fn (string $view): bool => ! str_ends_with($view, '-text.blade.php')));

        $this->assertCount(4, $htmlViews, 'Review newly added HTML email templates and update the expected branded template count.');
        foreach ($htmlViews as $view) {
            $this->assertStringContainsString(
                '<x-mail.layout',
                (string) file_get_contents($view),
                basename($view).' must use the shared KAILA mail layout.',
            );
        }
    }
}
