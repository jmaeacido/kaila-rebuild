# Pre-hire driving distance estimates

## Decision

Matched-job cards request a server-side driving route from the provider's current device position to the same neighborhood-level, three-decimal destination exposed before hiring. The endpoint returns only distance, duration, and an `approximate` flag. It never returns the destination or route geometry.

If the routing provider is unavailable, the client may show the existing great-circle calculation only when it is explicitly labeled as straight-line distance.

## Rationale

Great-circle distance materially understates real travel on the road network and was previously presented simply as “Distance from you.” Server-side routing uses KAILA's configured maps provider while preserving the product's rule that exact job coordinates remain private until hiring.

## Consequences

- Pre-hire driving distance remains approximate because the destination is deliberately rounded.
- The matched provider must grant browser location access to receive an estimate.
- Production requires the configured routing service to be available; the UI degrades to a clearly labeled straight-line estimate when it is not.
