# Phase 7 migration rehearsal and cutover

ADR-0013 permits eligible active accounts, provider profiles, taxonomy mappings, and non-sensitive job/offer/review history after legal/privacy approval. Passwords, sessions, messages, precise location, and media are excluded. Account claim/reset is mandatory.

The UTF-8 JSON export uses `schema_version: "1.0"`, `source.read_only: true`, `approvals.legal_privacy_review: true`, and arrays under `entities` for `categories`, `areas`, `users`, `provider_profiles`, `jobs`, `offers`, and `reviews`. Each row has a unique `legacy_id`; references use `*_legacy_id`. Export with a SELECT-only legacy identity into approved encrypted storage.

```powershell
Push-Location apps/api
php artisan legacy:rehearse C:\secure\legacy-core-manifest.json --report=C:\secure\reports\reconciliation.json
Pop-Location
```

The report contains source/eligible/exception counts, manifest and per-entity SHA-256 checksums, mapping version, and row exceptions. Any exception blocks cutover. Unexplained drift between exports restarts approval.

Cutover requires two clean rehearsals from separate exports, sampled comparisons, a restore drill, no critical/high security findings, entry-level Android and target-browser performance/accessibility evidence, stakeholder UAT, named support, and an approved maintenance window.

Freeze legacy writes, take the final backup/export, rerun reconciliation, import through a separately reviewed transactional importer, force account claim, validate counts/checksums/samples, then open pilot access gradually. Roll back by stopping new-platform writes, preserving audit evidence, restoring the target backup, and returning traffic to the frozen legacy release. Never reverse-sync partial records into legacy.
