<?php

namespace App\Console\Commands;

use App\Mail\BrandedTestMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendTestMail extends Command
{
    protected $signature = 'mail:test {email : Recipient address}';

    protected $description = 'Send a KAILA-branded test email through the configured mailer';

    public function handle(): int
    {
        $email = (string) $this->argument('email');

        Mail::to($email)->send(new BrandedTestMail);

        $sender = (string) config('mail.from.address');
        $this->info("KAILA-branded test email sent to {$email} from {$sender}.");

        return self::SUCCESS;
    }
}
