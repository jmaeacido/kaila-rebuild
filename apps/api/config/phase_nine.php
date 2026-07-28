<?php

return [
    'enabled' => (bool) env('PHASE_NINE_ENABLED', true),
    'direct_messages' => (bool) env('PHASE_NINE_DIRECT_MESSAGES', true),
    'calls' => (bool) env('PHASE_NINE_CALLS', false),
    'community' => (bool) env('PHASE_NINE_COMMUNITY', true),
    'katabang' => (bool) env('PHASE_NINE_KATABANG', true),
    'analytics' => (bool) env('PHASE_NINE_ANALYTICS', true),
    'turn_configured' => filled(env('WEBRTC_TURN_URL')) && filled(env('WEBRTC_TURN_USERNAME')) && filled(env('WEBRTC_TURN_CREDENTIAL')),
    'turn_url' => env('WEBRTC_TURN_URL'),
    'turn_username' => env('WEBRTC_TURN_USERNAME'),
    'turn_credential' => env('WEBRTC_TURN_CREDENTIAL'),
    'analytics_minimum_cohort' => max(5, (int) env('ANALYTICS_MINIMUM_COHORT', 10)),
];
