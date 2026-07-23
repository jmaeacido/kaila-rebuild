<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use LogicException;

class BrandedWelcome extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct()
    {
        $this->afterCommit();
    }

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        if (! $notifiable instanceof User) {
            throw new LogicException('The KAILA welcome email can only be sent to a user.');
        }

        return (new MailMessage)
            ->subject('Welcome to KAILA')
            ->view('mail.auth.welcome', [
                'name' => (string) $notifiable->name,
                'appUrl' => rtrim((string) config('app.url'), '/'),
                'providerIntent' => (bool) $notifiable->provider_intent,
            ])
            ->text('mail.auth.welcome-text', [
                'name' => (string) $notifiable->name,
                'appUrl' => rtrim((string) config('app.url'), '/'),
                'providerIntent' => (bool) $notifiable->provider_intent,
            ]);
    }
}
