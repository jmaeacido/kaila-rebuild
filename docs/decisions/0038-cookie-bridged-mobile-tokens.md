# ADR 0038: Cookie-bridged mobile tokens for Capacitor native features

## Context

The Capacitor WebView uses Laravel cookie sessions for marketplace APIs, while
background navigation and some push registration paths require opaque bearer
tokens. `saveSession` existed but nothing minted tokens after browser login, so
Android navigation could not authenticate.

## Decision

Authenticated browser sessions may call `POST /api/v1/auth/mobile/bridge` to mint
a normal mobile access/refresh pair for the current user. Capacitor calls
`ensureMobileSession()` after auth and before background navigation. The Android
location service refreshes on 401, ignores 409 ordering conflicts, and uses
monotonic `capturedAt` timestamps. Access token TTL defaults to 120 minutes.

## Consequences

Logout clears stored mobile tokens on device. Bridge is cookie-authenticated and
CSRF-protected like other SPA mutations. Longer access TTL reduces mid-trip 401s;
refresh remains the source of truth for multi-hour trips.
