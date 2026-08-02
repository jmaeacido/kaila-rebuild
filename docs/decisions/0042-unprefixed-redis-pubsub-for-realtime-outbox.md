# ADR 0042: Unprefixed Redis pub/sub for realtime outbox

## Context

Laravel's default Redis key prefix (`{app}-database-`) was applied to
`Redis::publish()`, so outbox events were published to
`kaila-database-kaila:rebuild:realtime:events` while Socket.IO subscribed to
`kaila:rebuild:realtime:events`. Maintenance countdown broadcasts (and other
domain events) never reached connected clients.

## Decision

1. Add a dedicated `realtime_pubsub` Redis connection with an empty prefix.
2. Publish outbox realtime envelopes only through that connection.
3. Keep cache/queue key prefixing unchanged on the default Redis connections.
4. Consumer `MaintenanceGate` also polls `/platform/maintenance` so a missed
   socket publication still surfaces the countdown toast or active redirect.

## Consequences

Realtime delivery matches the configured `OUTBOX_REALTIME_CHANNEL`. Operators
can still rely on HTTP polling as a backup warning path during maintenance
scheduling.
