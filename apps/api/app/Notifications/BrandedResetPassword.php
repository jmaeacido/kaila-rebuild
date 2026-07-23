<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

class BrandedResetPassword extends ResetPassword
{
    public function toMail($notifiable): MailMessage
    {
        $url = $this->resetUrl($notifiable);

        return (new MailMessage)
            ->subject('Reset your KAILA password')
            ->view('mail.auth.reset-password', [
                'name' => (string) $notifiable->name,
                'resetUrl' => $url,
                'expiresInMinutes' => (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire'),
                'isAdministrator' => (bool) $notifiable->is_admin,
            ])
            ->text('mail.auth.reset-password-text', [
                'name' => (string) $notifiable->name,
                'resetUrl' => $url,
                'expiresInMinutes' => (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire'),
                'isAdministrator' => (bool) $notifiable->is_admin,
            ]);
    }
}
