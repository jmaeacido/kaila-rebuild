# Phase 1 authorization matrix

| Capability | Anonymous | Authenticated browser session | Authenticated Android session | Enforcement evidence |
| --- | --- | --- | --- | --- |
| Register, login, request/reset password | Allowed with validation and throttling | Allowed but not privileged | Allowed but not privileged | Authentication and password-recovery feature tests |
| Read current account | Denied | Own account only | Own account only | `auth` / `mobile.auth`; current-user tests |
| List browser sessions | Denied | Own sessions only | Denied | User-constrained database query; session authorization tests |
| Revoke browser session | Denied | Own session only | Denied | User ID included in delete predicate; forged/cross-user tests |
| List Android sessions | Denied | Denied | Own active device families only | User-constrained model query |
| Revoke Android session | Denied | Denied | Own device family only | User-constrained lookup; cross-user test |
| Refresh Android credentials | Valid refresh token required | No browser authority conferred | Token family only | Hash lookup, row lock, rotation/replay tests |
| Issue realtime ticket | Denied | Bound to current browser session | Bound to current Android family | Separate authenticated routes and ticket tests |
| Choose Socket.IO identity or room | Denied | Not client-selectable | Not client-selectable | Verified ticket subject creates server-owned `user:{id}` room |
| Publish outbox/realtime event | Denied | Denied | Denied | Internal service contract only; no public route |
| Read audit or outbox records | Denied | Denied | Denied | No public API route; direct database/operations access only |

All future Phase 2+ resources must add policy tests and matrix rows before a route is considered complete.
