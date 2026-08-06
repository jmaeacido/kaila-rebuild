# Decision 0048 — Nationwide marketplace addresses

## Status

Accepted (extended from Mindanao-only to full Philippines)

## Context

KAILA's address library previously covered only City of Gingoog, City of Butuan,
and Nasipit. Expanding coverage requires the full PSGC tree for Luzon, Visayas,
and Mindanao so home-area selection, provider coverage, and pin-derived job
areas can resolve nationwide.

Shipping every Philippine barangay through `GET /marketplace/reference-data`
would be too large for entry-level Android clients.

## Decision

1. Seed **all Philippine regions** through barangays from the PSA PSGC master
   list publication dated **2026-07-13**, stored as
   `apps/api/database/data/philippines-psgc.json`.
2. Regenerate that file with `node scripts/generate-philippines-psgc.mjs`
   (`pnpm psgc:philippines`).
3. Preserve existing Gingoog, Butuan, and Nasipit 10-digit codes. Keep Decision
   0010: City of Butuan remains under Agusan del Norte for marketplace selectors.
   Other highly urbanized cities stay under their region (Independent City path).
4. Flatten Manila district `submunicipality` rows: barangays attach directly to
   City of Manila so the existing province → city → barangay picker needs no
   extra level. Region-direct municipalities (e.g. Pateros) appear under
   Independent City alongside HUCs.
5. `GET /marketplace/reference-data` returns only non-barangay areas. Barangays
   load on demand via `GET /marketplace/areas?parentId=` and
   `GET /marketplace/areas/{id}`.
6. `JobAreaResolver` keeps PSGC code matching first and constrains name fallback
   to candidate cities instead of loading every barangay.

## Consequences

- Address pickers and job-pin resolution work nationwide once the seeder has run.
- Deployed environments pick up rows by re-running `MarketplaceReferenceSeeder`
  (idempotent upsert by `code`).
- Future PSGC refreshes update the JSON via the generate script, then re-seed.
- Manila barangay lists are large (~900); cascading still avoids shipping them
  on every page load.
