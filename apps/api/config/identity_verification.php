<?php

return [
    'capture_enabled' => (bool) env('IDENTITY_VERIFICATION_CAPTURE_ENABLED', false),
    'enforcement_enabled' => (bool) env('IDENTITY_VERIFICATION_ENFORCEMENT_ENABLED', false),
    'notice_version' => env('IDENTITY_VERIFICATION_NOTICE_VERSION', 'identity-verification-1.1'),
    'consent_version' => env('IDENTITY_VERIFICATION_CONSENT_VERSION', 'identity-consent-1.1'),
    'privacy_policy_version' => env('IDENTITY_VERIFICATION_PRIVACY_VERSION', '2026-09-11'),
    'purpose_statement' => env(
        'IDENTITY_VERIFICATION_PURPOSE',
        'To verify account identity, prevent and investigate fraud or impersonation, resolve platform disputes, enforce KAILA’s terms, and respond to valid legal requests.'
    ),
    'disk' => env('IDENTITY_EVIDENCE_DISK', 'identity-evidence-local'),
    'encrypt_at_rest' => (bool) env('IDENTITY_EVIDENCE_ENCRYPT_AT_REST', true),
    'max_upload_kilobytes' => (int) env('IDENTITY_EVIDENCE_MAX_KILOBYTES', 10240),
    'abandoned_hours' => 24,
    'approved_retention_days' => 30,
    'rejected_retention_days' => 60,
    'mfa_session_minutes' => (int) env('IDENTITY_MFA_SESSION_MINUTES', 60),
    'rollout_percent' => (int) env('IDENTITY_VERIFICATION_ROLLOUT_PERCENT', 0),
    'allowlist_user_ids' => array_values(array_filter(array_map('intval', explode(',', (string) env('IDENTITY_VERIFICATION_ALLOWLIST_USER_IDS', ''))))),
    'allowlist_emails' => array_values(array_filter(array_map(
        static fn (string $email): string => strtolower(trim($email)),
        explode(',', (string) env('IDENTITY_VERIFICATION_ALLOWLIST_EMAILS', ''))
    ))),
    'fail_closed' => (bool) env('IDENTITY_VERIFICATION_FAIL_CLOSED', true),
];
