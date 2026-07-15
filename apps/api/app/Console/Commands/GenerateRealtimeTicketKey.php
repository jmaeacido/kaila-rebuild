<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class GenerateRealtimeTicketKey extends Command
{
    protected $signature = 'realtime:key';

    protected $description = 'Generate an Ed25519 signing seed and matching Socket.IO verification key';

    public function handle(): int
    {
        $seed = random_bytes(SODIUM_CRYPTO_SIGN_SEEDBYTES);
        $keypair = sodium_crypto_sign_seed_keypair($seed);
        $publicKey = sodium_crypto_sign_publickey($keypair);
        $subjectPublicKeyInfo = hex2bin('302a300506032b6570032100').$publicKey;
        $pemBody = chunk_split(base64_encode($subjectPublicKeyInfo), 64, '\\n');
        $pem = '-----BEGIN PUBLIC KEY-----\\n'.$pemBody.'-----END PUBLIC KEY-----';

        $this->warn('Store the signing seed only in the Laravel secret environment:');
        $this->line('REALTIME_TICKET_SIGNING_SEED_BASE64='.base64_encode($seed));
        $this->newLine();
        $this->info('Configure the public verification key in the realtime service:');
        $this->line('REALTIME_TICKET_PUBLIC_KEY_PEM='.$pem);

        return self::SUCCESS;
    }
}
