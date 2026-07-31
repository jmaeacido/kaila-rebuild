# Decision 0011: Realtime reconciliation and pull-to-refresh

## Status

Accepted — 2026-07-31

## Context

Marketplace state is authoritative in Laravel and MySQL. Socket.IO publications are
user-scoped minimal invalidations delivered after commit through the durable outbox.
Mobile browsers and Android WebViews can suspend connections or block a WebSocket
transport temporarily, so receiving a delta cannot be the only recovery path.

## Decision

- The authenticated web shell maintains one ticket-authenticated Socket.IO connection.
- The client permits WebSocket with Socket.IO polling fallback and obtains a new
  single-use ticket for every bounded, jittered reconnect attempt.
- Domain events are de-duplicated by event ID and coalesced before affected screens
  re-fetch their REST resources.
- Connect, foreground, restored connectivity, and pull-to-refresh all dispatch the
  same reconciliation signal. REST remains authoritative in every case.
- Pull-to-refresh is a shared touch interaction available at the top of authenticated
  screens. It uses design tokens, a 44-pixel minimum control, reduced-motion support,
  and does not interfere once the document has scrolled.

## Consequences

Users see notifications, conversations, offers, opportunities, and job lifecycle
changes without manual reloads while still having an explicit recovery gesture.
Event bursts can cause multiple resource-specific reads, but the shared invalidation
hook coalesces them and no business transition is performed over Socket.IO.
