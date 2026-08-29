<?php

namespace Tests\Feature;

use App\Mail\BrandedTestMail;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SendTestMailTest extends TestCase
{
    public function test_it_sends_the_kaila_branded_delivery_check(): void
    {
        config(['app.url' => 'https://kaila-app.com']);
        Mail::fake();

        $this->artisan('mail:test', ['email' => 'support@kaila-app.com'])
            ->expectsOutput('KAILA-branded test email sent to support@kaila-app.com from no-reply@kaila-app.com.')
            ->assertSuccessful();

        Mail::assertSent(BrandedTestMail::class, function (BrandedTestMail $mail): bool {
            $html = $mail->render();

            return $mail->hasTo('support@kaila-app.com')
                && $mail->envelope()->subject === 'KAILA email is working'
                && str_contains($html, 'KAILA email check')
                && str_contains($html, 'https://kaila-app.com/brand/kaila-wordmark.png')
                && str_contains($html, 'mailto:support@kaila-app.com')
                && str_contains($html, 'Nearby help, made simple.');
        });
    }
}
