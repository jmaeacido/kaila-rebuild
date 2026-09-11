# Identity evidence storage — production control record

| Field | Value |
| --- | --- |
| Updated | 2026-09-11 |
| Owner | Security / release (self-review) — John Mark Agustin Estrosos Acido |

## Current deployment (this host)

| Item | Value |
| --- | --- |
| Provider | Local private disk on the KAILA API host (`identity-evidence-local`) |
| Path | `apps/api/storage/app/identity-evidence` |
| Region | Operator-controlled VPS hosting KAILA (Philippines operations) |
| Public access | Denied — disk is private; no public URL route for evidence |
| Access | Short-lived authenticated admin preview only (`Cache-Control: private, no-store`); MFA required |
| Encryption in transit | HTTPS/TLS at the reverse proxy |
| Encryption at rest | Application-level encryption via Laravel `Crypt` (`IDENTITY_EVIDENCE_ENCRYPT_AT_REST=true`) plus filesystem permissions `0660`/`0770` (owner www-data, group www-data — shared by PHP-FPM and the queue worker) |
| Object naming | `quarantine/{verificationId}/{uuid}.jpg` — never original filenames |
| Quarantine | Objects start `scan_status=pending` until malware scan marks `clean` or `rejected` |
| Backup behavior | Host backups may retain ciphertext blobs until backup expiry; deletion tombstones + `identity-evidence:replay-tombstones` must run after restore |
| Deletion lifecycle | Abandoned 24h; approved raw 30d; rejected 60d; legal holds pause purge; tombstones record original keys |

## Optional dedicated object storage

Disk `identity-evidence` (S3-compatible) is configured via `IDENTITY_AWS_*`. Before switching production to that disk, record bucket name, region, SSE/KMS key ID, IAM policy denying public ACLs, and backup/versioning expiry in this document and re-run tombstone replay tests.
