<?php

namespace Tests\Unit;

use App\Notifications\BrandedAndroidInternalTestAccessRequest;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\AnonymousNotifiable;
use Tests\TestCase;

class BrandedAndroidInternalTestAccessRequestTest extends TestCase
{
    public function test_it_renders_the_access_request_for_support(): void
    {
        config([
            'app.admin_url' => 'https://admin.kaila-app.com',
            'kaila.android_internal_test_url' => 'https://play.google.com/apps/internaltest/example',
        ]);

        $notification = new BrandedAndroidInternalTestAccessRequest(
            requesterName: 'Arlene Santos',
            requesterEmail: 'arlene@example.test',
            note: 'Happy to test provider flows.',
        );
        $notifiable = (new AnonymousNotifiable)->route('mail', 'support@kaila-app.com');
        $mail = $notification->toMail($notifiable);

        $this->assertInstanceOf(ShouldQueue::class, $notification);
        $this->assertSame(['mail'], $notification->via($notifiable));
        $this->assertSame('Android early access request: Arlene Santos', $mail->subject);
        $this->assertSame('arlene@example.test', $mail->replyTo[0][0] ?? null);
        $this->assertSame('Arlene Santos', $mail->replyTo[0][1] ?? null);

        $html = $mail->render();
        $this->assertStringContainsString('Arlene Santos', $html);
        $this->assertStringContainsString('arlene@example.test', $html);
        $this->assertStringContainsString('Happy to test provider flows.', $html);
        $this->assertStringContainsString('Open Admin People', $html);
        $this->assertStringContainsString('https://admin.kaila-app.com/users', $html);
        $this->assertStringContainsString('https://play.google.com/apps/internaltest/example', $html);
        $this->assertStringContainsString('kaila-bull-app-icon-v2.png', $html);
        $this->assertStringContainsString('kaila-wordmark.png', $html);
    }
}
