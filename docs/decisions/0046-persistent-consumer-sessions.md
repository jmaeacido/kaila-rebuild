# ADR 0046: Persistent consumer sessions until explicit logout

## Context

Browser and Capacitor WebView marketplace auth use Laravel cookie sessions.
`SESSION_LIFETIME` defaulted to 120 minutes of idle time. Users who left the app
idle (common for a marketplace that relies on FCM and Socket.IO) were sent to
login by `AuthGuard` via `/auth/session-status`. That broke the notify → open →
act loop even though FCM device rows were still registered.

Mobile bearer refresh tokens already last 30 days, but UI auth is cookie-based,
so those tokens did not keep the WebView signed in.

## Decision

1. Cookie session idle lifetime defaults to **525600 minutes (365 days)**,
   configurable via `SESSION_LIFETIME`.
2. Email/password login, registration, and social sign-in always set Laravel
   **remember-me**, so a closed or long-idle browser/WebView can rehydrate the
   session without asking for credentials again.
3. Sessions still end on explicit **Sign out**, **Sign out all devices**,
   password reset, account restriction/deletion, or staff revocation.

Admin tooling shares the same login endpoints and therefore the same persistence
policy; staff must use explicit logout when leaving a shared device.

## Consequences

Users stay signed in across days of non-use on browser and Android. Realtime
tickets and cookie-bridged mobile tokens can be minted again without a fresh
login. Stolen cookie risk window is longer; mitigate with secure cookie flags,
CSRF, session revocation UI, and password-reset session wipe (already present).
