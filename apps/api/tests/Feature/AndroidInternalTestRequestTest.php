<?php

namespace Tests\Feature;

use App\Notifications\BrandedAndroidInternalTestAccessRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AndroidInternalTestRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_request_queues_branded_mail_to_support(): void
    {
        Notification::fake();
        config(['kaila.support_email' => 'support@kaila-app.com']);

        $this->postJson('/api/v1/public/android-internal-test-requests', [
            'name' => '  Arlene Santos ',
            'email' => 'Arlene.Tester@Example.TEST',
            'note' => 'I want to try KAILA as a provider.',
        ])
            ->assertStatus(202)
            ->assertJsonPath('data.accepted', true);

        Notification::assertSentOnDemand(
            BrandedAndroidInternalTestAccessRequest::class,
            function (BrandedAndroidInternalTestAccessRequest $notification, array $channels, AnonymousNotifiable $notifiable): bool {
                $mail = $notification->toMail($notifiable);

                return ($notifiable->routes['mail'] ?? null) === 'support@kaila-app.com'
                    && $channels === ['mail']
                    && $mail->subject === 'Android early access request: Arlene Santos'
                    && ($mail->replyTo[0][0] ?? null) === 'arlene.tester@example.test'
                    && ($mail->replyTo[0][1] ?? null) === 'Arlene Santos';
            },
        );
    }

    public function test_public_request_rejects_invalid_payload(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/public/android-internal-test-requests', [
            'email' => 'not-an-email',
            'note' => str_repeat('x', 1001),
        ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonStructure([
                'error' => [
                    'fields' => [
                        'name',
                        'email',
                        'note',
                    ],
                ],
            ]);

        Notification::assertNothingSent();
    }

    public function test_public_request_allows_empty_note(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/public/android-internal-test-requests', [
            'name' => 'Devkev PH',
            'email' => 'devkev@example.test',
        ])
            ->assertStatus(202)
            ->assertJsonPath('data.accepted', true);

        Notification::assertSentOnDemand(BrandedAndroidInternalTestAccessRequest::class);
    }
}
