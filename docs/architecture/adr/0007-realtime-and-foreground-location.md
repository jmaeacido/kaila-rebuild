# ADR-0007 — Pilot realtime notifications and foreground-only live location

**Decision date:** 2026-07-10  
**Applies to:** New KAILA platform and later migration work

**Status:** Accepted

## Context

KAILA needs timely coordination, but unrestricted background location and broad realtime scope introduce privacy, battery, platform-policy, and implementation risks.

## Decision

The pilot may use realtime events and push notifications for urgent job activity. Location sharing is foreground-only: the provider must explicitly start sharing while the application is open and actively operating in the foreground.

Location sharing must be job-scoped, visible to the selected client only, revocable by the provider, and stopped automatically when travel ends, the app loses the required foreground capability, the job leaves an eligible state, or the user stops sharing.

Background location tracking is deferred.

## Consequences

- No background location permission or continuous closed-app tracking in the pilot.
- The app must communicate when foreground sharing is active or interrupted.
- Push notifications may wake/notify the device, but they do not authorize background GPS collection.
- Later background tracking requires a new ADR, privacy review, platform-policy review, and explicit consent design.


