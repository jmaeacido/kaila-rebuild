<?php

namespace Tests\Unit;

use App\Support\BrevoMailTransport;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mime\Email;
use Tests\TestCase;

class BrevoMailTransportTest extends TestCase
{
    public function test_it_sends_a_structured_email_and_uses_the_provider_message_id(): void
    {
        Http::fake([
            'api.brevo.com/*' => Http::response(['messageId' => '<brevo-message-id>'], 201),
        ]);

        $message = (new Email)
            ->from('KAILA <no-reply@kaila-app.com>')
            ->to('person@example.test')
            ->subject('Reset your password')
            ->text('Use the secure reset link.');

        $sent = (new BrevoMailTransport('test-key'))->send($message);

        $this->assertSame('brevo-message-id', $sent?->getMessageId());
        Http::assertSent(fn (Request $request): bool => $request->url() === 'https://api.brevo.com/v3/smtp/email'
            && $request->hasHeader('api-key', 'test-key')
            && $request['sender']['email'] === 'no-reply@kaila-app.com'
            && $request['to'][0]['email'] === 'person@example.test');
    }

    public function test_it_raises_a_transport_error_when_brevo_rejects_the_message(): void
    {
        Http::fake([
            'api.brevo.com/*' => Http::response(['message' => 'rejected'], 400),
        ]);

        $this->expectException(TransportException::class);

        (new BrevoMailTransport('test-key'))->send(
            (new Email)
                ->from('no-reply@kaila-app.com')
                ->to('person@example.test')
                ->subject('Test')
                ->text('Test'),
        );
    }
}
