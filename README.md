# KAILA

KAILA is a mobile-first local services marketplace. Phase 1 establishes the secure platform foundation described in the accepted architecture records.

## Applications

- `apps/web` — consumer/provider Next.js application
- `apps/admin` — structurally separate Next.js administrative application
- `apps/api` — Laravel REST API and identity authority
- `apps/realtime` — authenticated Socket.IO delivery service
- `packages/contracts` — runtime-validated TypeScript transport contracts
- `packages/design-tokens` — shared semantic KAILA design tokens

## Workstation requirements

- Node.js 24 LTS
- pnpm 11.13
- PHP 8.3 or later with Composer
- Docker Desktop with WSL 2 for the disposable MySQL, Redis, and MinIO environment

Open a new terminal after installing the prerequisites so the updated `PATH` is loaded.

## Setup

```powershell
Copy-Item .env.example .env
pnpm install
docker compose up -d

Push-Location apps/api
Copy-Item .env.example .env
composer install
php artisan key:generate
php artisan realtime:key
Pop-Location
```

Copy the generated signing seed only to `apps/api/.env`. Copy the matching public key to the realtime service environment. Never place the signing seed in a browser, Android bundle, or Socket.IO environment.

Run the outbox worker and scheduler in separate development terminals:

```powershell
php apps/api/artisan queue:work redis --queue=outbox,default --tries=5
php apps/api/artisan schedule:work
```

Never reuse the example passwords outside local development.

## Quality checks

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build

Push-Location apps/api
php artisan test
vendor/bin/pint --test
composer analyse
Pop-Location
```

## Implemented foundation

- Database-backed, secure browser sessions with CSRF protection
- Registration with frozen policy-version consent capture
- Login, current-user, logout, logout-all, session listing, and individual session revocation endpoints
- Short-lived Android access tokens with hashed, rotating single-use refresh sessions
- Refresh-token replay detection with device-session family revocation
- Enumeration-safe, rate-limited password recovery with single-use expiring tokens and session revocation
- Laravel-issued, session-bound Ed25519 realtime connection tickets
- Socket.IO ticket signature, issuer, audience, expiry, and single-use validation with server-derived user rooms
- Transactional outbox envelopes with stable event IDs, server timestamps, resource versions, and rollback safety
- Redis-backed outbox publication with idempotent claims, bounded retry backoff, stale-claim recovery, and failed-job visibility
- Login and registration rate limits
- Append-only authentication audit events with hashed request fingerprints
- Cross-user session authorization tests
- Stable JSON error envelopes for validation, authentication, and CSRF failures

Socket.IO/FCM outbox transports, multi-node Redis realtime coordination, observability, and foundational accessible components remain within Phase 1.

Phase 1 is not complete until the acceptance criteria in `docs/architecture/rebuild-roadmap.md` pass in CI and a disposable environment.
