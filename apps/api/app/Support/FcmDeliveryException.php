<?php

namespace App\Support;

use RuntimeException;

final class FcmDeliveryException extends RuntimeException
{
    public function __construct(
        public readonly int $status,
        public readonly ?string $errorCode,
    ) {
        $reason = $errorCode ? " ({$errorCode})" : '';
        parent::__construct("FCM delivery failed with status {$status}{$reason}.");
    }

    public function invalidatesDevice(): bool
    {
        return in_array($this->errorCode, ['UNREGISTERED', 'SENDER_ID_MISMATCH'], true);
    }
}
