# Identity-verification technical controls evidence

| Field | Value |
| --- | --- |
| Owner | Security owner (self-review) — John Mark Agustin Estrosos Acido |
| Updated | 2026-09-11 |
| Scope | Controls that exist in the KAILA rebuild codebase and staging host |

**Disclosure.** This is an operator self-assessment, not an independent security audit.

| Control | Status | Evidence |
| --- | --- | --- |
| Private object storage | Present (local dedicated disk) | `apps/api/config/filesystems.php` disks `identity-evidence-local` (0600/0700) and optional `identity-evidence` S3. Staging uses `IDENTITY_EVIDENCE_DISK=identity-evidence-local`. |
| Authorization on ID endpoints | Present | User routes under `auth` / `mobile.auth`; admin under `auth`+`admin`. Session token bound to user on submit. |
| No public ID-document URLs | Present | User status returns no URLs. Only admin watermarked preview via authenticated admin API with `Cache-Control: private, no-store`. |
| Encryption in transit | Assumed at edge | Production/staging HTTPS at nginx. |
| Encryption at rest | Partial / ops-dependent | Local filesystem permissions only; no application-level CMK. Production S3 SSE/KMS not configured on this host. |
| Audit logs | Present | `identity.consent_given`, `evidence_submitted`, `appeal_requested`, `consent_withdrawn`, `evidence_viewed`, `review_decided`, `evidence_purged`. |
| Log redaction of identity fields | Present (2026-09-11) | `SensitiveDataRedactor` redacts id/selfie/object_key/sha256/upload token keys. |
| File type/size validation | Present | Image upload validation, max KB config, GD re-encode to JPEG. |
| Malware scan / quarantine | Present | Store under `quarantine/`; `ScanIdentityEvidence`; admin preview/decide require `clean`. |
| Rate limiting | Present | Consent, submit, appeal, withdraw use `throttle:identity-verification`. |
| Administrative MFA | **Absent** | Blocker for access-matrix gate. |
| Retention / deletion jobs | Present | Hourly `identity-evidence:purge`; withdraw sets immediate `purge_after`. |
| Backup deletion / restore tombstones | **Absent** | DB tombstone after live delete only; no backup lifecycle replay. |
| Location only when necessary | Present (separate domain) | Travel consent + traveling state; not part of identity capture. |
| Account / data deletion | Partial | `/account-deletion` + API purge identity objects; consent withdraw; DSAR beyond account delete via Support + privacy email. |

## Accepted Philippine ID types (initial)

PhilID/ePhilID, passport, driver’s license, UMID, Postal ID, PRC, SSS, GSIS, PhilHealth, Voter’s ID, Senior Citizen ID, PWD ID, OFW ID, Seaman’s Book (`issuingCountry=PH`).
