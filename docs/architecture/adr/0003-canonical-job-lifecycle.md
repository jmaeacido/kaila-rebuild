# ADR-0003 — Canonical job lifecycle and transition control

**Decision date:** 2026-07-10  
**Applies to:** New KAILA platform and later migration work

**Status:** Accepted

## Context

The legacy platform contains overlapping and ambiguous job-status behavior. The rebuild requires one explicit lifecycle shared by database constraints, domain services, API behavior, notifications, UI labels, analytics, and future migration logic.

## Decision

The canonical job states are:

- `POSTED`
- `OFFERS_RECEIVED`
- `PROVIDER_SELECTED`
- `PROVIDER_TRAVELING`
- `WORKING`
- `COMPLETION_SUBMITTED`
- `COMPLETED`
- `RATED_CLOSED`
- `REVISION_REQUESTED`
- `DISPUTED`
- `CANCELLED`

No controller, client application, administrator screen, migration script, or background job may directly assign an arbitrary job state. All changes must pass through a single server-side transition service that validates the current state, requested transition, actor, resource ownership, preconditions, and concurrency version.

## Consequences

- The transition matrix in this document is authoritative.
- State labels may be localized or presented differently, but stored meanings may not diverge.
- Direct mass assignment of `state` is prohibited.
- Exceptional administrative corrections require an explicit audited transition path, reason, and actor.


