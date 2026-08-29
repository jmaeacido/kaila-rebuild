<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BrandedTestMail extends Mailable
{
    use Queueable, SerializesModels;

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'KAILA email is working');
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.system.test',
            text: 'mail.system.test-text',
            with: [
                'appUrl' => rtrim((string) config('app.url'), '/'),
            ],
        );
    }
}
