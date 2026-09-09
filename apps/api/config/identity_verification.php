<?php

return [
    'capture_enabled' => (bool) env('IDENTITY_VERIFICATION_CAPTURE_ENABLED', false),
    'enforcement_enabled' => (bool) env('IDENTITY_VERIFICATION_ENFORCEMENT_ENABLED', false),
    'notice_version' => env('IDENTITY_VERIFICATION_NOTICE_VERSION', 'identity-verification-1.0'),
    'privacy_policy_version' => env('IDENTITY_VERIFICATION_PRIVACY_VERSION', '1.0'),
    'disk' => env('IDENTITY_EVIDENCE_DISK', 'identity-evidence-local'),
    'max_upload_kilobytes' => (int) env('IDENTITY_EVIDENCE_MAX_KILOBYTES', 10240),
    'abandoned_hours' => 24,
    'approved_retention_days' => 30,
    'rejected_retention_days' => 60,
];
