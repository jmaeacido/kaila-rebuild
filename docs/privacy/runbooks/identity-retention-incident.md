# Identity evidence — retention, purge, and incident runbook

| Field | Value |
| --- | --- |
| Owner | Security + operations — John Mark Agustin Estrosos Acido |
| Updated | 2026-09-11 |

## Retention

- Abandoned: 24h
- Approved raw evidence: 30 days after approval
- Rejected: 60 days after decision (appeal window policy in pack)
- Consent/decision/audit: account life + 2 years (policy; counsel confirmation pending)

## Purge

1. Scheduler runs `php artisan identity-evidence:purge` hourly (`routes/console.php`).
2. Confirm queue worker includes `maintenance`.
3. On failure: check logs, disk, and `purged_at` gaps; re-run command; alert operator inbox.

## Incident (suspected misuse, breach, forged document)

1. Contain: disable capture flags if needed (`IDENTITY_VERIFICATION_CAPTURE_ENABLED=false`).
2. Preserve audit events; do not copy raw evidence to chat/email.
3. Assess NPC / data-subject notification duties (counsel pending — document facts immediately).
4. Rotate credentials; review admin access.

## Vendor

No identity processor is authorized. Adding one requires a new PIA and DPA before any evidence leaves KAILA-controlled systems.
