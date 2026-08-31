# ADR-0051 — Marketplace-focused Community Feed

**Decision date:** 2026-08-31  
**Status:** Accepted

## Decision

Expand the reversible Phase 9 Community module into KAILA's Community Feed. The feed remains isolated from job lifecycle and pricing state. It supports deliberate public posts, up to four scanned images, one Helpful reaction, comments with one reply level, author editing/deletion, safety reports, block-aware visibility, cursor pagination, and recipient-scoped realtime invalidation.

Community content is plain text. Client-provided authorization, counters, author identity, publication state, media paths, and area labels are never trusted. Area labels are derived from an existing area record. Media remains unavailable until malware scanning succeeds.

Video, mentions, hashtags, per-media discussions, algorithmic ranking, and private feed posts are deferred.

## Consequences

- Community can still be disabled independently through Phase 9 configuration.
- General publishing requires an operational moderation queue and community policy.
- Deleted content is hidden rather than physically removed so safety reports and audits remain meaningful.
- The mobile primary navigation remains limited to five destinations.
