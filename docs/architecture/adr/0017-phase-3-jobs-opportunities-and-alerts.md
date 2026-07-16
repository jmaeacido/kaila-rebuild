# ADR 0017: Phase 3 jobs, opportunities, and durable alerts

Status: Accepted — 2026-07-16

## Decision

KAILA stores marketplace jobs separately from Laravel's queue `jobs` table in `service_jobs`. Draft creation requires a client-scoped idempotency key. Every mutation increments a server-owned version and appends a timeline event; timeline rows are never updated.

Posting runs matching inside the same database transaction. A provider is eligible only when their profile is active and has the exact active service category and area; scheduled jobs additionally require a matching weekly availability slot. The resulting `job_opportunities` row is the authorization boundary for provider access.

The opportunity projection exposes the area, category, schedule, budget, description, and clean-attachment count. It never exposes client identity, address text, or coordinates before selection in Phase 4.

Each match creates a durable in-app notification and a transactional outbox event addressed to the server-owned user room. Active registered devices receive an observable queued delivery attempt through the FCM HTTP v1 transport. Tokens are encrypted at rest, retries are bounded, cleared alerts remain auditable, and production refuses the fake transport.

Job photos use the private asset disk, strict MIME/size/count limits, and a pending scan state. Pending or rejected files are not represented to providers.

## Consequences

- Reposting the same job is safe, and reusing a key with different content is rejected.
- Opportunity counts are deterministic and cannot be expanded by client payloads.
- FCM access-token rotation is a deployment responsibility; production must supply a valid short-lived token or replace the transport with a credential-provider implementation.
- Phase 4 can build offers against stable opportunity and job identifiers without weakening pre-hire privacy.
