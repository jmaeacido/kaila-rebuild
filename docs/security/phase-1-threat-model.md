# Phase 1 threat model

**Reviewed:** 2026-07-16

## Scope and trust boundaries

Phase 1 protects identity, browser and Android sessions, password recovery, realtime connection establishment, queue/outbox delivery, audit evidence, and local/CI infrastructure. The browser, Android application, network, Socket.IO clients, and all client-provided identifiers are untrusted. Laravel is the identity and policy authority; MySQL is the source of truth; Redis is coordination and delivery infrastructure, never authoritative state.

Protected assets include password hashes, session and refresh credentials, signing seeds, policy consent, user identifiers, audit history, outbox payloads, private location, and future message content.

## Threats and controls

| Threat | Control and evidence | Residual risk / next gate |
| --- | --- | --- |
| Credential stuffing and account enumeration | Email-plus-IP and IP throttles; generic login/recovery failures; audited outcomes; feature tests | Production edge throttling and abuse alert thresholds require staging tuning |
| Browser session theft or fixation | Regeneration after login; secure HttpOnly SameSite cookies; CSRF validation; session-specific and all-session revocation | Production TLS and cookie-domain configuration are deployment gates |
| Android token database theft | Opaque random access/refresh values are hashed at rest; short access lifetime; single-use rotation | Android secure-storage verification belongs to packaging phase |
| Refresh replay | Consumed token reuse revokes its complete device family and is audited | Distributed database availability remains required |
| Password-reset abuse | Hashed, expiring, single-use broker tokens; generic request response; successful reset revokes every session | Email provider link scanning behavior requires staging verification |
| Forged Socket.IO identity or room choice | Ed25519 ticket signature, issuer, audience, expiry and Redis single-use checks; rooms derived only from verified subject; cross-node test | Signing-seed rotation runbook remains a deployment operation |
| Cross-user object access | Every session query is constrained by authenticated owner; forged IDs fail feature tests; matrix below | Future resources require policy and matrix entries before exposure |
| Event loss before commit | Outbox record and domain write share a MySQL transaction; recovery scheduler scans committed rows | External Socket.IO/FCM consumers must deduplicate stable event IDs |
| Duplicate or concurrent event delivery | Database row claims, stable UUID, bounded retry, stale-claim recovery, consumer deduplication contract | At-least-once delivery intentionally permits identical redelivery |
| Redis compromise | Redis holds ephemeral queue, adapter, pub/sub, and replay keys only; no identity authority | Production network isolation, authentication and TLS are deployment gates |
| Sensitive-data leakage through logs | Structured metadata-only logging, hashed resource IDs, recursive redaction, request/trace IDs, tests | Exporter-specific redaction must be revalidated when selected |
| Secret committed to Git | Examples contain placeholders only; automated tracked-file secret scan runs in CI | Organization-wide secret scanning should also be enabled remotely |
| Supply-chain compromise | Frozen lockfiles, minimum-release-age policy, explicit build-script allowlist, Composer and pnpm audits | License review and continuous advisory monitoring remain operational duties |
| Malicious cross-origin requests | Explicit first-party origin allowlist, credentialed CORS policy, CSRF for browser mutations | Staging and production origins must be configured separately |

## Privacy rules

- Never log passwords, tokens, authorization headers, message bodies, precise coordinates, raw session IDs, or outbox payloads.
- Audit request fingerprints are keyed hashes. Audit and outbox rows are server-generated and append-oriented.
- Realtime publications carry explicit server-selected recipient user IDs; recipient routing fields are removed from the client event envelope.
- Production credentials belong in the deployment secret manager. No production legacy data is imported in Phase 1.

## Review triggers

Re-review this model before adding job/offer authorization, private uploads, FCM credentials, production observability exporters, a new authentication method, or any change to location visibility.
