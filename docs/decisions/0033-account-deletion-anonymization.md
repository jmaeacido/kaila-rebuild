# 0033 — Account deletion through irreversible anonymization

## Decision

KAILA fulfills an eligible account-deletion request immediately after password re-authentication and explicit typed confirmation. Deletion keeps the user row as a neutral `Deleted KAILA member` identity while irreversibly replacing direct identifiers, removing public profile media and provider credentials, deleting push and notification data, revoking browser and mobile sessions, and preventing future authentication.

Draft jobs and their media are removed because they have no shared marketplace history. Completed or otherwise retained job, offer, message, review, dispute, moderation, support, and audit relationships remain attached to the neutral identity when needed for the other participant's history, safety, fraud prevention, dispute handling, and operational integrity.

Deletion is blocked while the member participates in active work, an open dispute, or an open safety report. The API returns human-readable resolution paths. Every completed or blocked execution is written to a privacy-safe operational ledger containing an anonymous reference, outcome, blocker codes, timestamps, and a keyed identity hash; the ledger never returns the erased email or name to administrators.

## Consequences

- Foreign-key and evidentiary integrity are preserved without retaining a public or authenticatable identity.
- Browser and Capacitor clients use the same deletion policy and service.
- Physical profile and draft-job files are removed after the database transaction succeeds.
- Storage deletion is idempotent, but an unavailable object store can leave an orphaned private object requiring storage lifecycle cleanup; it cannot restore account access or public profile data.
- Administrators can monitor outcomes but cannot restore a deleted account.
