<?php

return [
    'provider' => env('MAPS_PROVIDER', 'fake'),
    'nominatim_url' => env('NOMINATIM_URL', 'http://127.0.0.1:8080'),
    'osrm_url' => env('OSRM_URL', 'http://127.0.0.1:5000'),
    'barangay_boundaries_url' => env(
        'BARANGAY_BOUNDARIES_URL',
        'https://ulap-nga.georisk.gov.ph/arcgis/rest/services/PSA/BarangayPopMF/MapServer/0/query',
    ),
    'request_timeout_seconds' => (int) env('MAPS_REQUEST_TIMEOUT_SECONDS', 5),
];
