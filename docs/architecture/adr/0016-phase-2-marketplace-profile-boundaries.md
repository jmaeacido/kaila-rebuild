# ADR-0016 — Phase 2 marketplace profile and verification boundaries

**Decision date:** 2026-07-16  
**Applies to:** Phase 2 marketplace reference data and profiles  
**Status:** Accepted

## Context

Discovery needs structured service and geographic matching without exposing private identity material or implying verification before review. Provider media must preserve ADR-0012's private storage and quarantine decision.

## Decision

- Taxonomy and areas are administrator-managed records. Provider services and areas use foreign keys; matching never compares free text.
- A provider is discoverable only when active and attached to the requested active category and active area.
- `active_mode` is only navigation context. Provider and administrator authority derive from profile state and the server-owned administrator flag.
- Public profiles exclude email, exact address, coordinates, credential documents, review notes, and storage keys.
- Private assets use server-owned keys and begin quarantined. Publication requires a clean scan. A verification badge requires an approved credential whose asset passed scanning.
- Taxonomy, area, scan, provider activation, and credential review stay in the separate admin application.

## Consequences

- Phase 3 must explicitly decide whether parent or neighboring areas expand opportunity matching.
- “Verified” means at least one approved credential in Phase 2; a later identity vendor requires a new decision and more specific badge language.
- Direct uploads may replace API-proxied uploads later only if they preserve short-lived authorization, server-owned keys, quarantine, and object authorization.
