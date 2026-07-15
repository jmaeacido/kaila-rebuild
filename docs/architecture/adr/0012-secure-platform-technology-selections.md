# ADR-0012 — Secure platform technology selections for Phase 1

**Decision date:** 2026-07-16  
**Decision owner:** John Mark Agustin Acido  
**Applies to:** Phase 1 foundation and pilot environments  
**Status:** Accepted

## Context

Phase 1 cannot be scaffolded coherently until identity, storage, asynchronous work, realtime scale, maps, push credential custody, observability, and deployment boundaries are selected.

## Decision

### Identity and sessions

- Laravel is the sole identity and authorization authority.
- First-party web clients use secure, `HttpOnly`, `SameSite=Lax` cookies with CSRF protection. Android uses short-lived bearer access tokens and single-use rotating refresh sessions stored in platform secure storage.
- Refresh sessions are hashed at rest, device-labelled, individually revocable, rotated on use, and revoke their token family on detected reuse. Socket.IO accepts only a short-lived Laravel-signed connection ticket and derives rooms server-side.
- Password recovery uses single-use, expiring server tokens. Login, registration, recovery, and token endpoints are rate limited and audited.

### Storage and media safety

- Use private S3-compatible object storage behind a provider-neutral Laravel filesystem interface. Local object storage is allowed only in disposable development environments.
- Uploads use short-lived signed upload authorization, strict size/type limits, server-owned object keys, signature validation, asynchronous malware scanning, and a quarantine state. Objects are not downloadable or publishable until clean.
- Downloads use short-lived, object-authorized signed URLs. Lifecycle and deletion rules follow asset type, disputes, legal holds, and the published retention policy.

### Queue, events, and realtime

- Redis is the pilot queue backend, cache/coordination store, and Socket.IO multi-node adapter. Laravel database transactions write a transactional outbox; workers publish committed events to Socket.IO and FCM.
- Queue jobs are idempotent, retry with bounded backoff, and enter an observable dead-letter/failure workflow. Redis is not the source of truth for domain state.
- Voice/video calls are deferred, so no TURN service is required for the pilot. Reintroducing calls requires a TURN provider selection and a separate reliability/privacy review.

### Maps and routing

- Use MapLibre-compatible map rendering to avoid coupling UI components to one vendor.
- Use a configurable managed geocoding/routing provider through a server-side adapter. Production provider selection and credentials are deployment configuration; no browser client may hold a privileged routing/geocoding secret.
- Phase 1 provides the adapter contract and a deterministic fake. A production vendor must be selected and a data-processing/coverage/cost review recorded before Phase 3 deployment; Phase 1 does not depend on a production maps contract.

### FCM and credential custody

- Firebase Cloud Messaging project ownership belongs to the KAILA organization, not an individual account. Production service credentials live only in the deployment secret manager; developers use separate non-production projects and least-privilege access.
- Credential creation, access, rotation, and revocation are auditable. No Firebase service-account JSON is committed or copied into the client bundle.

### Observability and environments

- Use OpenTelemetry-compatible structured logs, traces, and metrics with request, correlation, job, and event identifiers. Never log passwords, tokens, message bodies, precise coordinates, or unredacted personal data.
- Error reporting must support server-side redaction and environment separation. Provider choice remains replaceable behind OpenTelemetry/export interfaces.
- Maintain separate local, CI/test, staging, and production environments with distinct databases, object storage, Redis, FCM projects/credentials, encryption keys, and domains. Production access is least-privilege and audited.
- CI is the release gate. Staging deploys automatically after validation; production deployment is an explicit approved promotion of the same immutable build artifact.

## Consequences

- Phase 1 may choose maintained implementation packages that realize these decisions, but each added dependency must have a documented purpose and pass security/licensing review.
- Vendor-neutral interfaces are intentional where a commercial provider has not yet been contracted; this does not defer the security or data-boundary decision.
- Production maps procurement is a Phase 3 deployment gate, not a Phase 1 scaffolding blocker.

