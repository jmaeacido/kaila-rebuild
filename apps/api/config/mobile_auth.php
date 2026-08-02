<?php

return [
    'access_token_ttl_minutes' => (int) env('MOBILE_ACCESS_TOKEN_TTL_MINUTES', 120),
    'refresh_token_ttl_days' => (int) env('MOBILE_REFRESH_TOKEN_TTL_DAYS', 30),
];
