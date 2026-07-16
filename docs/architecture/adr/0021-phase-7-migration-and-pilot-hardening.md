# ADR-0021 — Phase 7 migration rehearsal and pilot hardening

**Decision date:** 2026-07-16
**Status:** Accepted

## Decision

Legacy profiling/export uses a SELECT-only identity outside application request paths. Rehearsals consume a versioned sanitized manifest and produce deterministic counts, exceptions, and checksums without writing either database. An excluded field, missing reference, duplicate ID, ambiguous status, or missing approval blocks cutover. Production import is separately reviewed and explicitly invoked after two clean rehearsals.

Pilot releases enforce bundle budgets in CI, expose honest offline state, and follow the SLO, restore, incident, abuse, support, cutover, and rollback procedures in `docs/operations/`.

## Consequences

- Rehearsal evidence is repeatable before production-import authority exists.
- Messages, media, credentials, sessions, and precise location cannot enter the core manifest.
- Hardware, infrastructure, penetration-test, and stakeholder gates require external evidence.
