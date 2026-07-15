<?php

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('KAILA_WEB_ORIGINS', 'http://localhost:3000,http://localhost:3001')),
    ))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => [
        'Accept', 'Authorization', 'Content-Type', 'Origin', 'X-CSRF-TOKEN',
        'X-Requested-With', 'X-Request-ID', 'X-XSRF-TOKEN', 'traceparent',
    ],
    'exposed_headers' => ['X-Request-ID'],
    'max_age' => 600,
    'supports_credentials' => true,
];
