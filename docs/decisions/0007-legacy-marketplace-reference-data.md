# Legacy marketplace reference data

## Status

Accepted

## Decision

The rebuild seeds the legacy application's 17 canonical service categories and
the complete Gingoog and Butuan address trees published in its two PSGC
workbooks.

Official 10-digit PSGC identifiers are stored in `areas.code` so references are
stable and traceable. The hierarchy follows the workbook geography:

- Region X → Misamis Oriental → City of Gingoog → barangays
- Region XIII → City of Butuan → barangays

Butuan is attached directly to its region because it is represented as a
highly urbanized city with no province row in the legacy source workbook.

Reference seeding uses `updateOrCreate` and does not delete unrelated records.
The three superseded service placeholders and four Davao-area placeholders from
the original rebuild seeder are deactivated rather than deleted. This makes
deployment and repeated seeding safe while avoiding broken foreign keys for
existing marketplace records.

## Consequences

- The API returns all legacy service and address options through the existing
  reference-data endpoint.
- Existing environments may retain unrelated reference rows. Known superseded
  placeholders are inactive, while all legacy rows exist and are active.
- Future PSGC updates should preserve codes and update names or hierarchy
  through the same idempotent seeder.
