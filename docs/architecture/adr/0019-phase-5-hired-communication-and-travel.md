# ADR-0019 — Phase 5 hired communication and foreground travel

**Decision date:** 2026-07-16  
**Status:** Accepted

## Decision

Job conversation access is derived only from the immutable accepted-offer snapshot. Messages are append-only, ordered per conversation, idempotent per sender command, encrypted before storage, and reconciled through REST; typing is ephemeral. Message objects remain private and scan-gated. A block in either direction disables new participant messages without erasing history. Administrators must supply an access reason for every read, producing an immutable access audit.

Travel is selected-provider initiated, per-job consented, and foreground-only. Laravel owns travel transitions and coordinate validation. Raw samples are visible only to the client and selected provider, expire after 24 hours unless held, and are never included in logs or realtime payloads. Realtime events are minimal invalidations; REST is authoritative after reconnect. Routing failure returns the current marker without ETA or route. Calls, background tracking, and pre-hire direct messaging remain deferred.

## Consequences

- A production maps adapter remains a deployment gate; the deterministic adapter is prohibited in production.
- Any job transition out of a travel-capable state must stop its active travel session in the same transaction.
- Encryption key rotation changes the key version for new messages; historical ciphertext remains readable through retained authorized key versions.
