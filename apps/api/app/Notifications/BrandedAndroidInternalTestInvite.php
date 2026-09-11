<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BrandedAndroidInternalTestInvite extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly ?string $recipientName = null,
        private readonly bool $isCorrection = false,
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
        $fullName = $this->recipientName;
        if ($fullName === null && $notifiable instanceof User) {
            $fullName = (string) $notifiable->name;
        }

        $data = [
            'name' => self::firstName($fullName),
            'testUrl' => (string) config('kaila.android_internal_test_url'),
            'founderName' => (string) config('kaila.founder_name'),
            'founderTitle' => (string) config('kaila.founder_title'),
            'isCorrection' => $this->isCorrection,
        ];

        return (new MailMessage)
            ->subject($this->isCorrection
                ? 'Correction: KAILA Android testing link'
                : "You're invited to test KAILA on Android")
            ->view('mail.ops.android-internal-test-invite', $data)
            ->text('mail.ops.android-internal-test-invite-text', $data);
    }

    public static function firstName(?string $fullName): string
    {
        $trimmed = trim((string) $fullName);
        if ($trimmed === '') {
            return '';
        }

        $parts = preg_split('/\s+/', $trimmed) ?: [];

        return (string) ($parts[0] ?? '');
    }
}
