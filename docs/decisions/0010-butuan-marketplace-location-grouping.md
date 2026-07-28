# Decision 0010 — Butuan marketplace location grouping

## Status

Accepted

## Context

The original reference-data decision represented the highly urbanized City of
Butuan directly under Region XIII. This is administratively accurate, but the
resulting `Independent City` label is unfamiliar in KAILA's address selectors.

## Decision

KAILA presents City of Butuan under `Agusan del Norte` in its consumer and
provider location selectors:

`Region XIII (Caraga) → Agusan del Norte → City of Butuan → barangays`

This is a marketplace navigation grouping, not a claim that Butuan is
administratively governed by Agusan del Norte. Stable PSGC codes remain on the
records, and authorization, pricing, matching, and service availability must
continue to use area identifiers rather than infer legal jurisdiction from the
display hierarchy.

## Consequences

- Users select Agusan del Norte instead of `Independent City` to reach Butuan.
- Existing Butuan and barangay identifiers remain unchanged.
- Seeded and deployed data use the same hierarchy.
