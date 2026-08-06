# Decision 0047 — Nasipit marketplace addresses

## Status

Accepted

## Context

KAILA's address hierarchy covered City of Gingoog and City of Butuan. Nasipit,
Agusan del Norte, is an adjacent municipality in the same Caraga province as
Butuan's marketplace grouping and needs the same selectable address tree.

## Decision

Seed Nasipit as a municipality under Agusan del Norte with its 19 barangays and
official 10-digit PSGC codes:

`Region XIII (Caraga) → Agusan del Norte → Nasipit → barangays`

Municipality code `1600209000` and barangay codes `1600209001`–`1600209020`
(skipping the unused `1600209003` gap from the official PSGC series) are stored
in `areas.code`. Existing Gingoog and Butuan identifiers are unchanged.

## Consequences

- Users can choose Nasipit from City / Municipality under Agusan del Norte.
- Provider coverage, job area resolution, and matching treat Nasipit like other
  city/municipality areas via the existing `city` / `municipality` type handling.
- Deployed environments pick up the rows by re-running
  `MarketplaceReferenceSeeder` (idempotent `updateOrCreate`).
