# Phase 1 acceptance report

**Rehearsal date:** 2026-07-16

## Acceptance criteria

| Criterion | Evidence | Result |
| --- | --- | --- |
| Register/login/logout/refresh/revoke | Browser and Android feature tests cover success, expiry, rotation, replay-family revocation, logout, session listing, and individual/all-session revocation | Pass |
| Forged IDs and cross-user access fail | Browser/mobile session authorization tests and forged bearer/realtime ticket tests | Pass |
| Strict TypeScript and PHP quality gates | Workspace lint/typecheck; Larastan level 8; Pint; PHPUnit/Vitest suites | Pass locally and configured as CI gates |
| Production builds | Consumer, admin, realtime, shared UI production builds | Pass locally and configured as CI gates |
| Signed Socket.IO identity, no client rooms | Laravel Ed25519 tickets; issuer/audience/expiry/Redis single-use verification; server-derived rooms | Pass |
| Multi-node realtime | Two live Socket.IO instances exchange a user-room event through the Redis adapter | Pass |
| No committed/default production secret | Placeholder-only examples and automated tracked/untracked-file secret scan | Pass |
| Disposable migrations | Separate MySQL database applied all migrations, rolled all back, reapplied all, and was removed | Pass |
| Private storage boundary | Maintained S3 adapter; private disk; MinIO bucket write/read/delete probe with cleanup | Pass |
| Queue/outbox reliability | Transaction rollback, row claims, retry recovery, stable event ID, Redis worker probe, scheduled recovery | Pass |
| Observability and redaction | UUID request IDs, W3C trace extraction, audit correlation, structured metrics/logs, sensitive-data redaction tests | Pass |
| Accessibility foundation | Semantic tokens, reusable controls/feedback, 44px targets, reduced-motion behavior, axe smoke test | Pass |
| Threat model and authorization matrix | `docs/security/phase-1-threat-model.md` and `docs/security/phase-1-authorization-matrix.md` | Pass |
| Dependency/security review | Composer/pnpm audits, supply-chain policy, license inventory | Pass |

## Additional ADR obligations

- Durable notification preferences allow muting messages/routine reminders and quiet hours while preventing security/material job notification disablement.
- The scheduled location-retention job deletes samples after 24 hours while respecting dispute and legal holds, records each run, and is safe before the location feature tables exist.
- The maps boundary is provider-neutral and has a deterministic fake; production configuration rejects the fake. Production vendor procurement remains the Phase 3 gate defined by ADR-0012.
- Local/test/staging configuration may use MinIO, log outbox transport, and fake maps. Production boot rejects local-only outbox/maps adapters.

## Release-gate note

The GitHub workflow runs on every branch push with Redis and MySQL service containers, frozen installs, tests, static analysis, builds, full migration rollback/reapply, dependency audits, and committed-secret scanning. A green workflow for the Phase 1 commit is the final remote confirmation of this report.
