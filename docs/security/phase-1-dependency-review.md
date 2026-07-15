# Phase 1 dependency and license review

**Reviewed:** 2026-07-16

## Added runtime dependencies and purpose

| Dependency | Purpose | Boundary |
| --- | --- | --- |
| Laravel framework and Predis | REST authority, transactions, sessions, queue/cache coordination | Server only |
| Flysystem AWS S3 adapter and AWS SDK | Provider-neutral private S3/MinIO storage | Server only; credentials remain server-side |
| Socket.IO and Redis adapter | Authenticated realtime delivery across multiple nodes | Realtime service only |
| node-redis | Ticket replay keys, pub/sub delivery, and Socket.IO adapter clients | Realtime service only |
| jose | Ed25519 realtime ticket verification | Realtime service only; public key only |
| Zod | Runtime validation of internal and client event envelopes | Shared/realtime |
| Next.js, React, and Lucide React | Consumer/admin application foundations and the sole icon family | Browser bundles |
| axe-core and Testing Library | Automated accessibility smoke testing | Development only |

## Supply-chain controls

- Composer and pnpm lockfiles are committed and installed frozen in CI.
- pnpm enforces a minimum release age, strict transitive checks, explicit native build-script allowlisting, and security overrides recorded in the workspace configuration.
- Composer and pnpm advisory scans report no known vulnerabilities at review time.
- The S3 adapter was constrained to maintained Flysystem `^3.25.1` and resolved to `3.35.2`, rather than the obsolete initial `3.0.0` resolution.
- CI scans tracked files for common private keys, realtime signing seeds, Firebase keys, Google API keys, and AWS access-key patterns.

## License conclusion

Runtime JavaScript dependencies are predominantly MIT, Apache-2.0, ISC, BSD, CC-BY-4.0, and 0BSD. Sharp’s platform binary reports Apache-2.0 and LGPL-3.0-or-later obligations; distribution must preserve its notices and dynamic-library compliance. PHP dependencies are predominantly MIT/BSD/Apache; Nette packages offer BSD-3-Clause as an available license option. No dependency identified in this review requires KAILA application source disclosure.

Repeat the advisory and license inventory before each release and whenever a new runtime dependency is introduced.
