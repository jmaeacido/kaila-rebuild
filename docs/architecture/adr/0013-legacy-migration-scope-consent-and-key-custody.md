# ADR-0013 — Legacy migration scope, consent, and encryption-key custody

**Decision date:** 2026-07-16  
**Decision owner:** John Mark Agustin Acido  
**Applies to:** Pilot migration planning and Phase 7 rehearsal  
**Status:** Accepted

## Context

ADR-0009 sequences migration after the secure foundation. Phase 0 must also decide which legacy data is eligible and how encrypted or user-generated content is treated.

## Decision

- Phase 1 imports no production legacy data.
- Phase 7 may migrate eligible active accounts, provider profiles, service taxonomy mappings, and non-sensitive job/offer/review history after dry-run reconciliation and legal/privacy review.
- Legacy passwords are not copied as trusted new credentials. Migrated users must complete a verified account-claim or password-reset flow, and duplicate identities require explicit reconciliation.
- Legacy direct messages, job messages, precise location samples, and media are excluded by default.
- Encrypted messages may be reconsidered only if lawful migration is approved, the source encryption key is positively identified, access is dual-controlled and audited, a representative decryption test succeeds, and users receive the required notice or consent. Failure of any condition means messages are not migrated.
- Media may be reconsidered only with verified ownership, user notice/consent where required, malware scanning, private-object authorization, retention classification, and an exception report. Unknown or orphaned media is rejected rather than made public.
- Migration never treats legacy identifiers as new primary keys and never turns ambiguous legacy states into authoritative canonical states without the accepted mapping and an exception path.

## Consequences

- The pilot can launch with claimed accounts and selected structured history without inheriting insecure sessions or indiscriminately copying sensitive content.
- Excluded data remains in the read-only legacy retention environment according to the approved retention/legal plan; it is not silently destroyed by the rebuild.
- Expanding migration scope requires an ADR amendment and another dry-run reconciliation.

