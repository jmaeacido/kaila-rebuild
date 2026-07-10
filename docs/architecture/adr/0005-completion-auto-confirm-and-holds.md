# ADR-0005 — Completion submission, 72-hour auto-confirmation, reminders, and holds

**Decision date:** 2026-07-10  
**Applies to:** New KAILA platform and later migration work

**Status:** Accepted

## Context

Providers need a predictable completion path, while clients need time to inspect work and request correction or raise a dispute.

## Decision

Only the selected provider may submit completion from `WORKING`. Submission moves the job to `COMPLETION_SUBMITTED` and records an immutable submission timestamp and evidence references.

The client may confirm completion at any time during the review period. If no permitted hold is active, the system automatically confirms completion 72 hours after the latest valid completion submission.

The system must send configurable reminder notifications before auto-confirmation. Reminder timing is configuration, not a hard-coded domain constant.

A valid `REVISION_REQUESTED` or `DISPUTED` branch prevents auto-confirmation:

- Revision request: the current auto-confirm timer is invalidated. The provider resumes work and a fresh 72-hour period begins after a new completion submission.
- Dispute: the active timer is paused. If resolution returns to `COMPLETION_SUBMITTED`, the remaining duration resumes. If resolution returns to another state, the old timer is invalidated.

All timer jobs must be idempotent and must re-check current state, deadline identity, and active holds before changing the job.

## Consequences

- Background scheduling is required, but timer execution cannot be trusted without state revalidation.
- `auto_confirm_at`, deadline identity/version, and hold data must be persisted.
- A late or duplicated queue job cannot complete an ineligible job.
- Completion evidence is retained even when revision is requested.


