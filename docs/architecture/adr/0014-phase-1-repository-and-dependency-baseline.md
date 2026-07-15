# ADR-0014 — Phase 1 repository and dependency baseline

**Decision date:** 2026-07-16  
**Decision owner:** John Mark Agustin Acido  
**Applies to:** Phase 1 platform foundation  
**Status:** Accepted for implementation

## Context

Phase 1 introduces several independently deployable applications that must share contracts without sharing authorization decisions or runtime secrets. The repository needs one repeatable developer and CI entry point while preserving Laravel as the sole identity and business-policy authority.

## Decision

- Keep the rebuild in one repository with deployable applications under `apps/` and runtime-neutral TypeScript contracts under `packages/`.
- Use `apps/web` for the Next.js consumer/provider application, `apps/admin` for the structurally separate Next.js administrative application, `apps/api` for Laravel, and `apps/realtime` for Socket.IO.
- Use a pnpm workspace for JavaScript packages. Use Composer independently within `apps/api`; PHP code is not coupled to the JavaScript package graph.
- Target Node.js 24 LTS and PHP 8.3 or later for Phase 1 development and CI.
- Use TypeScript strict mode in every JavaScript application and package. Use ESLint and framework production builds as release gates.
- Use Laravel migrations as the only persistent-schema authority. MySQL stores domain state; Redis supports queues, cache, coordination, and the Socket.IO adapter but is never domain truth.
- Keep shared contracts limited to transport schemas, stable error codes, and event envelopes. Server authorization, pricing, and state transitions remain in Laravel.
- Use Docker Compose as the documented disposable service environment for MySQL, Redis, and S3-compatible object storage. Native Laragon services may be used locally when their behavior matches the documented versions and configuration.
- Introduce dependencies only with a purpose recorded in the affected package README or this ADR.

## Initial dependency purposes

- Next.js and React provide the required responsive web application foundations.
- Laravel provides the REST API, session lifecycle, authorization policies, migrations, queues, and business rules.
- Socket.IO provides authenticated low-latency delivery and reconnect behavior; it does not process business transitions.
- Zod defines runtime-validated TypeScript API and event boundaries without making TypeScript types a security boundary.
- Lucide React is the sole icon package for consumer and admin interfaces.
- Redis coordinates Laravel queues/outbox publishing and Socket.IO nodes.
- Predis provides Laravel's Redis client where the local PHP runtime does not bundle the native extension.
- MinIO supplies disposable S3-compatible development storage only.

## Consequences

- Consumer and admin code can share tokens and transport contracts only through explicit packages; they do not share navigation or feature composition by default.
- Cross-language contracts require generated fixtures or contract tests before endpoints are considered stable.
- A production object-storage, observability, and maps vendor can be selected later behind the frozen interfaces, but security boundaries cannot be deferred.
