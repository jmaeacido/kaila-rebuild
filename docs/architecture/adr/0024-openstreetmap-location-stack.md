# ADR-0024 — Self-hosted OpenStreetMap location stack

**Decision date:** 2026-07-16  
**Decision owner:** John Mark Agustin Acido  
**Applies to:** KAILA map display, Philippine geocoding, routing, distance, and ETA  
**Status:** Accepted

## Context

KAILA requires a provider-neutral map renderer and production routing/geocoding, but the owner has rejected paid map subscriptions. Public OpenStreetMap geocoding and routing demo endpoints are not production services. Map tiles, location search, and routes must remain replaceable and must not expose privileged server credentials.

## Decision

- Use MapLibre GL JS for the consumer map renderer.
- Use the commercially permitted OpenFreeMap public vector-tile service initially, with required attribution and a future self-hosting escape hatch. No availability guarantee is assumed.
- Run Nominatim and OSRM privately on KAILA-controlled infrastructure using a Philippines-only OpenStreetMap extract.
- Laravel remains the geocoding and routing boundary. Nominatim and OSRM listen only on loopback and are never exposed directly to browsers.
- Restrict geocoding to the Philippines. Treat OSRM duration as a non-traffic estimate and label it as ETA rather than live traffic.
- Keep the deterministic fake only for local development and automated tests. Production rejects it.
- Fail safely: if geocoding or routing is unavailable, preserve the selected area, pinned coordinates, chat, and lifecycle state while omitting route/ETA projections.

## Consequences

- There are no map subscription or per-request fees, but KAILA owns updates, capacity, backups, monitoring, and availability for geocoding and routing.
- OpenFreeMap attribution must remain visible. A tile outage must not block core job actions.
- Philippine coverage and address quality depend on OpenStreetMap data and require sampled field validation.
- OSRM and Nominatim datasets must be refreshed through a staged rebuild and atomic service replacement rather than editing live indexes.
