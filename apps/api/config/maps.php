<?php

return [
    'provider' => env('MAPS_PROVIDER', 'fake'),
    'nominatim_url' => env('NOMINATIM_URL', 'http://127.0.0.1:8080'),
    'osrm_url' => env('OSRM_URL', 'http://127.0.0.1:5000'),
    'request_timeout_seconds' => (int) env('MAPS_REQUEST_TIMEOUT_SECONDS', 5),
];
