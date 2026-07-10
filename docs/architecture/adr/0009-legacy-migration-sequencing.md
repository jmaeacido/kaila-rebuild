# ADR-0009 — Legacy migration follows the secure foundation

**Decision date:** 2026-07-10  
**Applies to:** New KAILA platform and later migration work

**Status:** Accepted

## Context

Migrating legacy data before the new identity, authorization, constraints, auditing, and canonical state semantics are stable would import ambiguity and security debt into the rebuild.

## Decision

The legacy application and database are read-only reference sources during the foundation phase. No production legacy data will be imported until the new platform's secure foundation, canonical schemas, authorization model, and migration rules are complete and tested.

Migration will be a separate, repeatable, dry-run-capable process with source-to-target mappings, rejected-row reporting, reconciliation, and rollback strategy. Legacy identifiers must be retained in dedicated mapping fields/tables rather than replacing new primary keys.

## Consequences

- Phase 1 creates only new-platform migrations.
- No dual writes and no opportunistic copying from legacy tables.
- Migration scripts must not become ordinary application request paths.
- Legacy behavior does not override accepted ADRs.


