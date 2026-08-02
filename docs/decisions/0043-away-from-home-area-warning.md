# 0043 — Soft warning when current city differs from home or coverage

## Decision

When a signed-in member’s browser location resolves to a city or municipality that differs from their configured home or coverage area, KAILA shows a dismissible warning under the session bar.

- Clients are compared against the city/municipality of `client_profiles.area_id`.
- Providers are compared against the unique city/municipality set derived from `provider_service_areas`.
- Current location reuses `GET /api/v1/jobs/resolve-area`, which now also returns `cityId` / `cityName`.
- Comparison is city-level only. Same-city barangay differences do not warn.
- Missing home/coverage data, denied geolocation, or unresolved pins stay silent.
- Dismissal is session-scoped per home set and current city; it does not change matching.

## Consequences

- Members are nudged to keep home or coverage aligned with where they actually are.
- Opportunity matching and job area derivation remain area-ID based and unchanged.
- Geolocation is requested once in the authenticated shell with a multi-minute `maximumAge`, not continuously watched.
