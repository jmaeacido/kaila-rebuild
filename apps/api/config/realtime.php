<?php

return [
    'ticket_issuer' => 'kaila-api',
    'ticket_audience' => 'kaila-realtime',
    'ticket_ttl_seconds' => (int) env('REALTIME_TICKET_TTL_SECONDS', 60),
    'ticket_signing_seed_base64' => env('REALTIME_TICKET_SIGNING_SEED_BASE64'),
];
