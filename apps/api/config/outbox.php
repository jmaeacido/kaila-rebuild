<?php

return [
    'transport' => env('OUTBOX_TRANSPORT', 'log'),
    'dispatch_batch_size' => (int) env('OUTBOX_DISPATCH_BATCH_SIZE', 100),
    'processing_timeout_seconds' => (int) env('OUTBOX_PROCESSING_TIMEOUT_SECONDS', 300),
];
