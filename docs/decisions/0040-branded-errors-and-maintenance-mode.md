# ADR 0040: Branded error pages and scheduled maintenance mode

## Context

KAILA needed consumer-grade HTTP error surfaces and a controllable maintenance
window. Stock Next/Laravel/nginx errors and `artisan down` alone could not warn
connected users with a countdown or keep staff operations available.

## Decision

1. Ship KAILA-branded status pages for 400/401/403/404/408/429/500/502/503/504 in
   the web and admin apps (`not-found`, `error`, `global-error`, `/status/[code]`),
   plus static HTML under `public/status/` for gateway fallbacks.
2. Store maintenance state in `platform_maintenance` with phases `idle`,
   `scheduled`, and `active`.
3. Super admins and admins schedule a countdown; Socket.IO broadcasts
   `platform.maintenance.scheduled` to the `broadcast:authenticated` room so
   every connected user sees a persistent toast with a live countdown.
4. `platform:activate-maintenance` (every minute) and optional immediate activate
   flip the gate; API middleware returns 503 for non-staff traffic while staff
   continue to manage the window.
5. Realtime publications may use `{ broadcast: "authenticated" }` instead of the
   100-recipient user ID list when the audience is every connected session.

## Consequences

Nginx must point gateway error_page directives at the static status HTML when
upstream is down. Consumers hitting an already-active window are redirected to
`/status/503`. Staff and auth/bootstrap routes remain reachable during
maintenance.
