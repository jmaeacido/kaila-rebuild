# 0012: Derive the job area from its map pin

## Status

Accepted

## Context

Job posting previously asked clients to select a province, city or municipality, and barangay in
addition to placing a job-site pin. The area is required for privacy-safe provider matching, but
the duplicate location entry slows the consumer flow and can contradict the pin.

## Decision

The post-job flow uses the map pin as the source of truth. The API performs a point-in-polygon query
against the configured Philippine Statistics Authority barangay boundary service. It matches the
resulting PSGC code, with normalized locality names as a fallback, against KAILA's active barangay
reference data. The resolved area identifier is returned to the form and remains required by the
existing server-side job validation and matching rules.

The landmark is optional supporting information and is not used to authorize, price, or match a
job.

## Consequences

- Clients no longer manually select the province, city, or barangay while posting.
- Unsupported or unresolved pins fail visibly before the client can continue.
- Provider matching and pre-hire barangay privacy remain unchanged.
- PSA boundary-service availability and boundary currency are operational dependencies.
  Reference-data PSGC codes must remain aligned as KAILA expands to more locations.
