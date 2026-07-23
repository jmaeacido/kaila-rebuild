<?php

namespace Tests\Unit;

use App\Models\User;
use App\Notifications\BrandedWelcome;
use Illuminate\Contracts\Queue\ShouldQueue;
use Tests\TestCase;

class BrandedWelcomeTest extends TestCase
{
    public function test_it_renders_branded_html_and_plain_text_for_the_primary_app(): void
    {
        $user = new User([
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.test',
            'provider_intent' => true,
        ]);
        $notification = new BrandedWelcome;
        $message = $notification->toMail($user);
        $html = $message->render();

        $this->assertInstanceOf(ShouldQueue::class, $notification);
        $this->assertSame(['mail'], $notification->via($user));
        $this->assertSame('Welcome to KAILA', $message->subject);
        $this->assertStringContainsString('Nearby help starts here', $html);
        $this->assertStringContainsString('finish your provider profile', $html);
        $this->assertStringContainsString('https://kaila-app.com/brand/kaila-wordmark.png', $html);
        $this->assertStringContainsString('href="https://kaila-app.com"', $html);
        $this->assertStringNotContainsString('rebuild.kaila-app.com', $html);
        $this->assertIsArray($message->view);
        $this->assertSame('mail.auth.welcome', $message->view['html']);
        $this->assertSame('mail.auth.welcome-text', $message->view['text']);
    }
}
