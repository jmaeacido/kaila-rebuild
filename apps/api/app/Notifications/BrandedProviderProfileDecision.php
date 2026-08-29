<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use LogicException;

class BrandedProviderProfileDecision extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly bool $approved,
        private readonly ?string $reason = null,
    ) {
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
            throw new LogicException('The KAILA provider-profile decision email can only be sent to a user.');
        }

        $data = [
            'name' => (string) $notifiable->name,
            'appUrl' => rtrim((string) config('app.url'), '/'),
            'approved' => $this->approved,
            'reason' => $this->reason,
        ];

        return (new MailMessage)
            ->subject($this->approved ? 'Your KAILA provider profile is approved' : 'Update on your KAILA provider profile')
            ->view('mail.profile.provider-decision', $data)
            ->text('mail.profile.provider-decision-text', $data);
    }
}
