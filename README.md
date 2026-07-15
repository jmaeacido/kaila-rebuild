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
Pop-Location
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
- Login and registration rate limits
- Append-only authentication audit events with hashed request fingerprints
- Cross-user session authorization tests
- Stable JSON error envelopes for validation, authentication, and CSRF failures

Android access tokens, rotating refresh families, password recovery, and Laravel-issued realtime connection tickets remain in the next authentication increment.

Phase 1 is not complete until the acceptance criteria in `docs/architecture/rebuild-roadmap.md` pass in CI and a disposable environment.
