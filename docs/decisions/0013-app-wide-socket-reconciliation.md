# ADR 0013: App-wide Socket.IO invalidation and REST reconciliation

Date: 2026-07-30

Status: Accepted

## Context

KAILA already delivered authenticated domain events through the transactional
outbox, Redis, and Socket.IO, but the web client opened a connection only on the
work screen. Other screens required navigation, polling, or manual refresh to
observe committed changes. Per-screen socket connections would multiply
handshakes, consume one-time tickets incorrectly during reconnects, and make
deduplication inconsistent.

## Decision

- The authenticated web application owns one Socket.IO connection for the
  lifetime of the root layout.
- Every connection and reconnection uses a newly issued, single-use realtime
  ticket. The browser never chooses rooms; the server derives the user room from
  verified ticket claims.
- Domain events include their server-owned type and stable event ID. The client
  deduplicates at-least-once delivery by event ID.
- Socket.IO events invalidate relevant resources. Screens then refetch their
  authorized REST projection instead of trusting event payloads as state.
- Reconnect, returning online, and returning to the foreground trigger
  reconciliation so missed events cannot leave stale UI.
- Mutation producers record outbox events in the same transaction as durable
  state. Ephemeral call signaling and foreground geolocation retain their
  specialized transport/recovery behavior.
- The transport accepts historical server-authored `user:<id>` room payloads
  during recovery and converts only those rooms to recipient IDs. Arbitrary room
  names remain rejected; all new events use explicit recipient audiences.
- FCM remains responsible for background and closed-app notification delivery.

## Consequences

- Route changes do not create duplicate sockets.
- Open screens update without manual refresh.
- Event payloads remain minimal and authorization stays in REST projections.
- At-least-once duplicates are harmless, and reconnect gaps recover from server
  state.
- New user-visible mutations must add an outbox event and a matching screen
  invalidation before they meet the definition of done.
