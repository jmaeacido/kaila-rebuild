<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BrandedAndroidInternalTestAccessRequest extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $requesterName,
        private readonly string $requesterEmail,
        private readonly ?string $note = null,
        private readonly ?string $requestId = null,
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
        $adminEarlyAccessUrl = rtrim((string) config('app.admin_url'), '/').'/early-access';
        if (is_string($this->requestId) && $this->requestId !== '') {
            $adminEarlyAccessUrl .= '?request='.rawurlencode($this->requestId);
        }

        $data = [
            'requesterName' => $this->requesterName,
            'requesterEmail' => $this->requesterEmail,
            'note' => $this->note,
            'submittedAt' => now()->timezone(config('app.timezone'))->toDayDateTimeString(),
            'adminEarlyAccessUrl' => $adminEarlyAccessUrl,
            'playTestUrl' => (string) config('kaila.android_internal_test_url'),
        ];

        return (new MailMessage)
            ->subject('Android early access request: '.$this->requesterName)
            ->replyTo($this->requesterEmail, $this->requesterName)
            ->view('mail.ops.android-internal-test-access-request', $data)
            ->text('mail.ops.android-internal-test-access-request-text', $data);
    }
}
