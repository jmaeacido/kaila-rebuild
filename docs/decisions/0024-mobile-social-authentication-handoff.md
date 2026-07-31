# ADR-0024: Mobile social authentication handoff

## Status

Accepted

## Context

Google and Facebook OAuth complete in a trusted system browser on Android. Browser
cookies are intentionally isolated from Capacitor's WebView, so the browser
session cannot authenticate the managed KAILA application directly.

## Decision

Android opens provider authorization with Capacitor Browser. The app creates a
high-entropy verifier, stores it with a ten-minute expiry in Android encrypted
preferences, and sends only its SHA-256 challenge with the authorization request.
Persistent encrypted storage allows the handoff to survive activity or WebView
recreation while Facebook or Google is foregrounded. After server-side provider
verification, Laravel creates a five-minute, single-use exchange code bound to that
challenge and returns through `kaila://app`. The WebView presents both the code and
verifier to Laravel, which atomically consumes the exchange, clears the verifier,
and creates the WebView's first-party session. Closing the provider browser without
a callback restores the social buttons instead of leaving the screen busy.

Provider access tokens and client secrets remain server-only. A custom-scheme
interceptor cannot redeem the short-lived code without the verifier retained by
the initiating KAILA WebView.

## Consequences

- Mobile OAuth does not depend on cookie sharing between Chrome and WebView.
- Browser OAuth callback URLs registered with Google and Facebook remain HTTPS.
- Failed and cancelled provider flows return to an actionable KAILA error state.
- The exchange cache must support short-lived entries and locks; production uses
  the selected Redis cache.
