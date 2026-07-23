<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

class BrevoMailTransport extends AbstractTransport
{
    public function __construct(private readonly string $apiKey)
    {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        $email = $message->getOriginalMessage();
        if (! $email instanceof Email) {
            throw new TransportException('Brevo requires a structured email message.');
        }
        if ($email->getAttachments() !== []) {
            throw new TransportException('Brevo attachments are not configured for this application.');
        }

        $sender = $email->getFrom()[0] ?? null;
        if (! $sender instanceof Address) {
            throw new TransportException('Brevo requires a sender address.');
        }

        $payload = [
            'sender' => $this->address($sender),
            'to' => array_map($this->address(...), $email->getTo()),
            'subject' => (string) $email->getSubject(),
        ];
        if ($email->getHtmlBody() !== null) {
            $payload['htmlContent'] = $email->getHtmlBody();
        }
        if ($email->getTextBody() !== null) {
            $payload['textContent'] = $email->getTextBody();
        }
        if ($email->getReplyTo() !== []) {
            $payload['replyTo'] = $this->address($email->getReplyTo()[0]);
        }
        if ($email->getCc() !== []) {
            $payload['cc'] = array_map($this->address(...), $email->getCc());
        }
        if ($email->getBcc() !== []) {
            $payload['bcc'] = array_map($this->address(...), $email->getBcc());
        }

        $response = Http::asJson()
            ->acceptJson()
            ->withHeaders(['api-key' => $this->apiKey])
            ->timeout(15)
            ->post('https://api.brevo.com/v3/smtp/email', $payload);

        if (! $response->successful()) {
            throw new TransportException('Brevo rejected the email request with status '.$response->status().'.');
        }

        $messageId = $response->json('messageId');
        if (is_string($messageId) && $messageId !== '') {
            $message->setMessageId(trim($messageId, '<>'));
        }
    }

    public function __toString(): string
    {
        return 'brevo';
    }

    /** @return array{email: string, name?: string} */
    private function address(Address $address): array
    {
        $result = ['email' => $address->getAddress()];
        if ($address->getName() !== '') {
            $result['name'] = $address->getName();
        }

        return $result;
    }
}
