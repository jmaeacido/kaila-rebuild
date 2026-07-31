# Decision 0026: Unified Firebase push and realtime feedback

## Status

Accepted

## Context

The Android client registered tokens in a different Firebase project from the
API sender, browser push had no Firebase web app or service worker, and realtime
events reconciled data without visible feedback or delivery acknowledgement.

## Decision

Use Firebase project `kaila-a50f5` for API, Android, and browser messaging.
Android release builds receive the matching ignored `google-services.json`
through the protected GitHub environment. The browser registers FCM tokens with
the existing push-device API and uses a first-party service worker for background
display. Socket.IO clients acknowledge domain events, while the server records
recipient and acknowledgement counts. A global feedback layer shows incoming
notifications, connection recovery, and existing successful action feedback.

## Consequences

Existing Android installations created with the old Firebase sender must update
before they can register a valid token. Browser users must grant notification
permission. Durable notifications and server-state reconciliation remain the
source of truth when push or sockets are unavailable.
