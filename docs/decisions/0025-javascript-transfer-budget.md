# Decision 0025: Measure JavaScript budgets as compressed transfer bytes

## Status

Accepted

## Context

KAILA's build budget summed the uncompressed size of every emitted JavaScript
chunk. That total includes route-scoped code that is never loaded together and
MapLibre's embedded worker source. After the Next.js 16.2.11 upgrade, the raw
aggregate exceeded its threshold even though route splitting and the bytes sent
to users did not regress proportionally.

## Decision

Measure every emitted JavaScript chunk at gzip level 9 and enforce aggregate
transfer budgets of 625,000 bytes for the consumer web application and 250,000
bytes for the admin application. The aggregate remains deliberately stricter
than a per-route check and includes lazy route chunks.

## Consequences

The gate now represents network transfer cost while continuing to catch growth
in shared and route-scoped JavaScript. Changes to compression, route loading, or
runtime parse cost still require separate performance review.
