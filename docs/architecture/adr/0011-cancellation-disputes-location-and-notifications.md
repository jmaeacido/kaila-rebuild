# ADR-0011 — Pilot cancellation, dispute, location-retention, and notification policy

**Decision date:** 2026-07-16  
**Decision owner:** John Mark Agustin Acido  
**Applies to:** New KAILA pilot  
**Status:** Accepted

## Context

The lifecycle ADR defines where cancellation and dispute branches may occur, but Phase 0 also requires the operating policy: who may act, what happens on no-shows or rescheduling, what authority support has, how location data is retained, and how intrusive notifications may be.

## Decision

### Cancellation, no-show, and rescheduling

- Before provider selection, the client may cancel with a reason. Providers withdraw their own offers rather than cancel the job.
- After provider selection and before `WORKING`, either participant may request cancellation. A mutual cancellation completes immediately; a unilateral cancellation records the initiating party and reason and may be disputed. The pilot has no KAILA cancellation fee or financial penalty.
- After `WORKING`, cancellation is handled as a dispute-supported termination, preserving all job history and evidence.
- A no-show may be reported by either participant after 30 minutes beyond the agreed start or arrival time. It opens a dispute case; it does not automatically establish fault.
- Rescheduling requires both participants to accept an immutable proposed schedule revision. Until both accept, the existing schedule remains authoritative. A rejected or expired proposal does not cancel the job.
- `CANCELLED` is terminal. Rebooking creates a new job linked to the prior job for audit purposes.

### Disputes and support authority

- Either participant may open a dispute from the eligible states in the canonical transition matrix and must provide a reason. Evidence is optional at opening and may be added while the case is active.
- Assigned support staff may inspect job-scoped evidence and conversation history only after recording an access reason. Every access and decision is append-only audited.
- Support may return a job to its captured eligible state, require revision, confirm completion, or cancel it. Support cannot change accepted commercial terms, impose or transfer money, rewrite reviews, or delete history.
- A participant may appeal once within seven days of a support decision by providing a new reason or new evidence. A different authorized support reviewer must decide the appeal. Reopening after that window requires an administrator-recorded exceptional reason and does not alter immutable history.

### Location consent, visibility, and retention

- Exact job coordinates are visible to the job owner and, only after selection, the selected provider when needed to perform the job. Opportunity and pre-selection views expose only privacy-minimized area and approximate distance.
- Foreground live sharing requires an explicit per-job start action and an always-visible sharing indicator. It stops under ADR-0007 conditions.
- Raw live-location samples are retained for 24 hours after travel stops, then deleted by an auditable retention job. A minimized travel summary—start/end timestamps, arrival status, and coarse route metrics—may be retained with the job for dispute and audit purposes.
- Location access and retention must be disclosed in versioned consent/privacy text. Revoking sharing stops new collection but does not erase records under an active dispute or legal hold.

### Notifications and direct communication

- Pilot notifications are limited to actionable job, offer, hired-job message, travel/arrival, completion, dispute, review, account-security, and support events.
- Urgent job-state and account-security events may use push plus in-app delivery. Routine reminders use standard notification priority. No full-screen intent, persistent alarm, repeated sound loop, or promotional push is allowed.
- Users may mute message and routine reminder notifications, but security and material job-state changes remain enabled while the account/job is active. Quiet hours suppress sound for non-urgent events without delaying the durable in-app notification.
- Direct messaging before hire and voice/video calls are not part of the pilot. Job-scoped messaging opens only after provider selection. Feed, AI, advanced analytics, operations research tooling, integrated payments, and background location remain deferred under ADR-0008.

## Consequences

- Phase 1 must support versioned policy consent, audit records, durable notification preferences, and retention jobs.
- Phase 6 implements the detailed cancellation/dispute rules and tests them against the canonical lifecycle.
- Financial penalties, automated fault findings, more than one ordinary appeal, and pre-hire direct communication require a later ADR.

