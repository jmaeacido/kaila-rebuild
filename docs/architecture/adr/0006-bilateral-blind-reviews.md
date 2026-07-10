# ADR-0006 — Bilateral, blind-published reviews with a seven-day window

**Decision date:** 2026-07-10  
**Applies to:** New KAILA platform and later migration work

**Status:** Accepted

## Context

Immediate publication of the first review can influence or retaliatorily shape the other party's review. Both parties need a fair and bounded opportunity to submit feedback.

## Decision

After a job reaches `COMPLETED`, the client may review the selected provider and the selected provider may review the client. Each side may submit at most one final review for the job.

The review window closes seven days after `completed_at`.

Reviews are blind-published:

- neither party sees the other party's submitted review while the counterpart can still submit;
- both reviews become visible immediately after both are submitted; or
- at the seven-day deadline, any submitted review becomes visible and the review process closes.

When both reviews are submitted or the deadline expires, the job moves to `RATED_CLOSED`. Submitted reviews are immutable through normal application behavior. Moderation may hide content but must not silently rewrite a review.

## Consequences

- Review visibility is distinct from review submission.
- A review deadline job is required and must be idempotent.
- A job may close with two, one, or zero reviews.
- Reviews are unavailable for cancelled jobs.


