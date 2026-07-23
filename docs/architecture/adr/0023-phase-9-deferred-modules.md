# ADR-0023 — Phase 9 deferred module reintroduction

**Decision date:** 2026-07-16
**Status:** Accepted

## Context

ADR-0008 excluded direct pre-hire messaging, calls, community publishing, AI capabilities, and advanced analytics from the secure core. Phase 9 authorizes reconsideration only through a new scoped decision. The core hire-to-completion flow is stable and must not depend on optional modules.

## Decision

Phase 9 introduces independently reversible modules behind server-side configuration:

- Direct conversations use explicit recipient acceptance, participant-only access, block enforcement, encrypted message bodies, idempotent commands, and minimal realtime invalidation.
- Audio/video calls store lifecycle metadata and emit authorized notifications only for accepted direct conversations or hired-job participants. Calls default off and remain unavailable unless managed TURN credentials are configured. SDP and ICE payloads are never persisted by Laravel.
- Community posts are deliberate public sharing, never automatic job/profile disclosure. Publication and reactions are isolated from marketplace state and designed for moderation extension.
- Katabang is a deterministic navigation assistant. It cannot select providers, set pricing, authorize transitions, or provide professional advice. Stored interaction records contain intent and input length, not message content.
- Analytics expose aggregate operational counts only to administrators. Core marketplace metrics are suppressed below a configurable cohort floor of at least five users.
- The operations validation suite is read-only and checks required boundaries, schema, queue, realtime signing, and optional TURN readiness.
- Richer administrative analytics remain structurally separate under `apps/admin`.

The modules do not modify the canonical job lifecycle, accepted commercial snapshot, authorization policy, or payment boundary.

## Consequences

- Every module can be disabled without blocking job posting through completion.
- Production calls require managed TURN deployment, representative mobile-network validation, abuse review, and Android/store policy approval.
- Community moderation operations and production policy staffing must be established before broad public rollout.
- Any future model-backed Katabang or predictive analytics requires a separate privacy, safety, quality, cost, and data-governance decision.
