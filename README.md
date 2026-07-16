# KAILA

KAILA is a mobile-first local services marketplace connecting clients with trusted local independent service providers.

## Project status

Phase 3 — job posting and provider opportunities — is complete as of July 16, 2026.

- All acceptance criteria passed locally and in the disposable development environment.
- The final [GitHub Actions workflow](https://github.com/jmaeacido/kaila-rebuild/actions/runs/29452651122) passed on commit `bf999c4`.
- Detailed evidence is recorded in the [Phase 1 acceptance report](docs/architecture/phase-1-acceptance-report.md).
- Phase 2 acceptance evidence is recorded in the [Phase 2 acceptance report](docs/architecture/phase-2-acceptance-report.md).
- Phase 3 acceptance evidence is recorded in the [Phase 3 acceptance report](docs/architecture/phase-3-acceptance-report.md).

## Applications

- `apps/web` — consumer/provider Next.js application
- `apps/admin` — structurally separate Next.js administrative application
- `apps/api` — Laravel REST API and identity authority
- `apps/realtime` — authenticated Socket.IO delivery service
- `packages/contracts` — runtime-validated TypeScript transport contracts
- `packages/design-tokens` — shared semantic KAILA design tokens
- `packages/ui` — reusable accessible consumer component foundations

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
- Redis-coordinated Socket.IO rooms, replay protection, validated realtime publications, and cross-node tests
- Correlated structured logs, W3C trace context, metrics, and recursive sensitive-data redaction
- Durable notification preferences and auditable location-retention scheduling
- Private S3-compatible storage adapter with disposable MinIO verification
- Provider-neutral maps contract with a deterministic non-production fake
- Semantic design tokens and axe-tested accessible controls, feedback, and loading states
- CI MySQL/Redis acceptance services, dependency audits, and committed-secret scanning
- Login and registration rate limits
- Append-only authentication audit events with hashed request fingerprints
- Cross-user session authorization tests
- Stable JSON error envelopes for validation, authentication, and CSRF failures

## Completed Phase 2

Phase 2 implements service taxonomy, geographic hierarchy and service areas, client and provider profiles, availability, private portfolio and credential assets, credential review state, deterministic eligible-provider discovery, privacy-safe public profiles, and separate administrative workflows for taxonomy and verification.

## Completed Phase 3

Phase 3 implements the three-step job-posting flow, idempotent drafts and posting, quarantined job photos, privacy-minimized provider opportunities, deterministic category/area/availability matching, durable Socket.IO/FCM notifications, and an immutable job timeline.

## Next phase

Phase 4 is next: immutable offers and revisions, comparison, provider selection, and the accepted commercial snapshot.
