# ADR-0015 — Transactional outbox delivery semantics

**Decision date:** 2026-07-16

**Applies to:** Phase 1 event publication foundation

**Status:** Accepted

## Context

Domain changes will eventually trigger Socket.IO, FCM, email, and internal asynchronous work. Publishing directly from request handlers can expose uncommitted state or lose events when a process fails between a database commit and external delivery.

## Decision

- Domain services record an outbox event inside the same MySQL transaction as the authoritative state change. The recorder rejects calls without an active transaction.
- Every event has a stable UUID, event type, resource type and ID, monotonic resource version, server-owned occurrence and availability timestamps, and a JSON payload.
- A post-commit dispatch provides low latency. A scheduled recovery scan re-enqueues committed events that were not dispatched or whose processing claim became stale.
- Redis queue jobs claim rows under a database lock, use bounded retry backoff, and record attempts and redacted failure details. Published rows are immutable delivery history.
- Delivery is at least once. Transports and downstream consumers must deduplicate by event ID. A transport success followed by a database failure may therefore produce a duplicate, but never a new event identity.
- The local-only foundation log transport records envelope metadata only. It never logs payloads or raw resource IDs, and application startup rejects it in production. Socket.IO and FCM transports are separate later Phase 1 adapters.

## Consequences

- External delivery never precedes the database commit.
- Transaction rollback removes the corresponding outbox event.
- Worker restarts and retry races do not create new logical events.
- Operations can inspect pending, attempted, failed, and published records without accessing sensitive payloads through logs.
- Event producers must assign resource versions consistently, and every future consumer must implement event-ID deduplication.
