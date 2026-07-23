<?php

namespace Tests\Unit;

use App\Models\User;
use App\Notifications\BrandedResetPassword;
use Illuminate\Auth\Notifications\ResetPassword;
use Tests\TestCase;

class BrandedResetPasswordTest extends TestCase
{
    public function test_it_renders_branded_html_and_plain_text_with_the_admin_reset_url(): void
    {
        ResetPassword::createUrlUsing(
            fn (User $user, string $token): string => 'https://admin.kaila-app.com/reset-password?token='.$token.'&email='.urlencode($user->email),
        );
        $user = new User([
            'name' => 'Administrator',
            'email' => 'admin@example.test',
            'is_admin' => true,
        ]);

        $message = (new BrandedResetPassword('secure-token'))->toMail($user);
        $html = $message->render();

        $this->assertStringContainsString('KAILA Administration', $html);
        $this->assertStringContainsString('Reset password', $html);
        $this->assertStringContainsString('admin.kaila-app.com/reset-password', $html);
        $this->assertStringContainsString('https://kaila-app.com/brand/kaila-wordmark.png', $html);
        $this->assertStringContainsString('kaila-app.com', $html);
        $this->assertStringNotContainsString('rebuild.kaila-app.com', $html);
        $this->assertNotNull($message->view);
    }
}
