# Decision 0008: Legacy job lifecycle experience

**Date:** 2026-07-28  
**Status:** Accepted by implementation approval

## Context

The legacy KAILA application had a complete and proven flow from job posting through bilateral rating. The rebuild already contained the authoritative Laravel lifecycle and isolated screens for posting, offers, hiring, conversation, travel, and work, but the consumer web work screen still used canned completion, revision, and five-star review submissions.

The Product Design Document requires seven visible stages with one highlighted action:

1. Posted
2. Offers received
3. Provider selected
4. Provider traveling
5. Working
6. Completed
7. Rated

## Decision

Preserve the legacy process while presenting it through the canonical server-owned state machine:

- Providers start work and submit an immutable completion cycle with a written summary and optional evidence.
- Clients confirm completion, request correction, or open a support review.
- Pre-work cancellation uses the existing mutual-agreement policy after selection.
- Clients and providers each submit one blind review.
- Legacy `Payment Released` copy and behavior are not reproduced; the rebuild uses `Completed`.
- The work surface reconciles `job` domain invalidations through the existing authenticated Socket.IO service and reloads authoritative REST state. Focus and timed refresh remain recovery mechanisms.
- Existing user-room outbox payloads are normalized centrally into the realtime transport contract (`recipientUserIds` plus minimal `data`) before persistence.

The browser loads the protocol-matched Socket.IO client served by KAILA's realtime endpoint only when a hired-job screen needs it. This avoids adding the client to the initial web bundle and keeps the entry-device performance budget intact. It is not used for lifecycle authority or client-supplied state transitions.

## Consequences

- The end-to-end user journey retains the useful legacy sequencing without copying its Bootstrap/AdminLTE presentation.
- Pending cancellation, dispute, evidence-scan, review-submission, and deadline state are visible without exposing participant identifiers.
- The REST API remains authoritative after every local command or realtime notification.
