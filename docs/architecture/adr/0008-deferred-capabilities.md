# ADR-0008 — Deferred capability boundary

**Decision date:** 2026-07-10  
**Applies to:** New KAILA platform and later migration work

**Status:** Accepted

## Context

The legacy system and product backlog contain features that would dilute the secure core rebuild.

## Decision

The following capabilities are outside the initial secure-core phases unless a later ADR explicitly reintroduces them:

- social/community feed;
- in-app voice/video calls;
- AI features;
- advanced analytics;
- APK self-update;
- integrated payments;
- background location tracking.

The foundation may provide generic extension points such as queues, events, an outbox, and audit logs, but it must not implement hidden partial versions of deferred features.

## Consequences

- No tables, endpoints, navigation items, placeholder business flows, or dependencies dedicated solely to deferred features.
- Scope expansion requires an explicit decision rather than opportunistic implementation.
- Generic infrastructure must remain product-neutral.


