# 0071: Opaque public provider URLs

## Decision

Public provider pages use a stable `public_slug` composed of the provider's initial display-name slug and a random suffix, for example `/providers/zels-computer-store-k7m4p9x2qf`.

Numeric provider-profile IDs remain server-side identifiers for authenticated marketplace operations. Existing numeric public links continue to resolve and immediately canonicalize to the opaque URL.

## Rationale

Sequential database IDs look unfinished in consumer-facing links and invite casual enumeration. A random, stable suffix avoids collisions and predictable URLs without coupling link stability to later display-name changes. This is a URL-design and privacy-hardening measure, not an authorization control; only active profiles are publicly returned.
