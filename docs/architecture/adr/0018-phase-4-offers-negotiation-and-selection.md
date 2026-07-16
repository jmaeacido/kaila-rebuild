# ADR 0018: Phase 4 offers, negotiation, and provider selection

Status: Accepted — 2026-07-16

## Decision

KAILA implements ADR-0004 as one offer thread per provider and job with append-only, monotonically numbered revisions. Both the client and that provider may propose the next revision. Commercial values use integer centavos and an accepted revision is copied into a one-per-job immutable commercial snapshot.

Only a provider holding an active Phase 3 opportunity may create an offer. Providers can read only their own thread; the job owner can compare every thread through a projection containing provider trust, price, availability, duration, scope, and history. Repeated identical create/revision commands return the existing state without duplicating history.

Selection locks the job, requires its current open state and the exact latest unexpired revision, and relies on a unique job snapshot constraint as the final concurrent-write guard. The transaction accepts one thread, rejects active competitors, dismisses non-selected opportunities, advances the job to `provider_selected`, appends its timeline event, and records notification/outbox delivery for the selected provider.

## Consequences

- Offer history and accepted terms cannot be overwritten through product APIs.
- A provider cannot infer a competitor's identity or terms.
- Exactly one assignment and accepted commercial snapshot can exist per job.
- Closing and selection notifications remain durable and reconcile through REST after realtime reconnect.
- KAILA records an agreed amount but does not describe it as paid, escrowed, released, or guaranteed.
