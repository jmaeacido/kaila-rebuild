<?php

return [
    'driver' => env('MEDIA_SCANNER', 'clamav'),
    'clamav_socket' => env('CLAMAV_SOCKET', '/run/clamav/clamd.ctl'),
    'timeout_seconds' => (int) env('CLAMAV_TIMEOUT_SECONDS', 30),
    'chunk_bytes' => (int) env('CLAMAV_CHUNK_BYTES', 65536),
];
