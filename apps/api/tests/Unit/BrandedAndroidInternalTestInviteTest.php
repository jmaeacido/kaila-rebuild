<?php

namespace Tests\Unit;

use App\Models\User;
use App\Notifications\BrandedAndroidInternalTestInvite;
use Illuminate\Contracts\Queue\ShouldQueue;
use Tests\TestCase;

class BrandedAndroidInternalTestInviteTest extends TestCase
{
    public function test_it_renders_the_android_internal_test_invite(): void
    {
        config([
            'kaila.android_internal_test_url' => 'https://play.google.com/apps/testing/com.kaila.marketplace',
            'kaila.founder_name' => 'John Mark Agustin E. Acido',
            'kaila.founder_title' => 'KAILA Founder',
        ]);

        $user = new User(['name' => 'Arlene Santos', 'email' => 'arlene@example.test']);
        $notification = new BrandedAndroidInternalTestInvite;
        $mail = $notification->toMail($user);

        $this->assertInstanceOf(ShouldQueue::class, $notification);
        $this->assertSame(['mail'], $notification->via($user));
        $this->assertSame("You're invited to test KAILA on Android", $mail->subject);

        $html = $mail->render();
        $this->assertStringContainsString('Hi Arlene', $html);
        $this->assertStringContainsString('Become a tester', $html);
        $this->assertStringContainsString('closed testing', $html);
        $this->assertStringContainsString('https://play.google.com/apps/testing/com.kaila.marketplace', $html);
        $this->assertStringContainsString('John Mark Agustin E. Acido', $html);
        $this->assertStringContainsString('KAILA Founder', $html);
    }

    public function test_first_name_falls_back_when_name_is_missing(): void
    {
        $this->assertSame('', BrandedAndroidInternalTestInvite::firstName(null));
        $this->assertSame('', BrandedAndroidInternalTestInvite::firstName('   '));
        $this->assertSame('Arlene', BrandedAndroidInternalTestInvite::firstName('Arlene Santos'));
    }

    public function test_it_renders_a_correction_for_an_earlier_bad_link(): void
    {
        config([
            'kaila.android_internal_test_url' => 'https://play.google.com/apps/testing/com.kaila.marketplace',
        ]);

        $user = new User(['name' => 'Arlene Santos', 'email' => 'arlene@example.test']);
        $mail = (new BrandedAndroidInternalTestInvite($user->name, true))->toMail($user);

        $this->assertSame('Correction: KAILA Android testing link', $mail->subject);
        $html = $mail->render();
        $this->assertStringContainsString('earlier invitation included the wrong', $html);
        $this->assertStringContainsString('https://play.google.com/apps/testing/com.kaila.marketplace', $html);
    }
}
