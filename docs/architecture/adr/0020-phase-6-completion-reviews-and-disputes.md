# ADR-0020 — Phase 6 completion, reviews, cancellation, and disputes

**Decision date:** 2026-07-16  
**Status:** Accepted

## Decision

One transactional lifecycle service owns Phase 6 state changes, optimistic job versions, timeline records, realtime invalidations, and travel shutdown. Completion submissions are immutable cycles with private scan-gated evidence and persisted deadline identities. A configurable 72-hour deadline is revalidated by an idempotent scheduled command; revisions invalidate it and disputes pause it.

Cancellation before selection is client-owned. After selection and before work, both participants must agree. Once work starts, termination requires a dispute decision. Disputes preserve the captured resume state, append evidence/actions/access audits, constrain support outcomes, allow one seven-day appeal, and require a different appeal reviewer.

Reviews are one final submission per participant, blind until both submit or the seven-day window closes. Publication and the reputation projection update atomically. Support moderation may hide a review with an audit reason but cannot rewrite it. Product copy uses “Completed”; no payment behavior is introduced.

## Consequences

- Queue workers must run the application scheduler for completion and review deadlines.
- Private evidence requires the existing object-storage scanner before it can be served.
- Realtime payloads remain minimal invalidations; REST reconciliation is authoritative.
- Terminal and held states stop active foreground travel transactionally.
