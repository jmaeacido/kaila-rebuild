# ADR-0004 — Immutable offer and counterproposal revision history

**Decision date:** 2026-07-10  
**Applies to:** New KAILA platform and later migration work

**Status:** Accepted

## Context

Editing an offer in place destroys the commercial history needed to determine what was proposed, countered, and accepted.

## Decision

Each provider may have one negotiation thread for a job. An offer thread contains an append-only sequence of immutable revisions.

Every offer or counterproposal creates a new revision containing, at minimum:

- offer thread identifier;
- monotonically increasing revision number;
- proposing actor;
- proposed price or pricing terms;
- scope/description;
- estimated schedule or duration when applicable;
- message and structured terms;
- creation timestamp.

Previous revisions may never be edited or deleted through normal application behavior. The offer thread may point to its latest revision for efficient reads. Acceptance must reference the exact immutable revision that the client accepted.

Offer-thread terminal outcomes include `ACCEPTED`, `REJECTED`, `WITHDRAWN`, and `EXPIRED`. Selecting one provider atomically accepts the chosen revision and closes incompatible competing offers.

## Consequences

- Negotiation history remains auditable.
- API updates create revisions rather than mutate commercial terms.
- Accepted terms remain stable even if later revisions exist elsewhere.
- Database constraints must prevent two accepted offers for one job.


