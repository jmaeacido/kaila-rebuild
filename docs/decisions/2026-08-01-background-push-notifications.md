# Background push notification delivery

## Decision

KAILA uses server-originated Firebase Cloud Messaging notification payloads for job requests, offers, job updates, messages, and calls. Socket.IO remains the foreground realtime path, but is not relied on when the app is inactive or closed.

Android notifications use stable channels created by the native Capacitor host:

- `kaila_updates`: audible, high-importance job requests, offers, and lifecycle updates
- `kaila_messages`: audible, high-importance messages
- `kaila_calls`: audible, high-importance incoming-call alerts
- `kaila_silent`: quiet-hours delivery without sound or vibration

FCM payloads use high Android priority and the device's default notification sound unless quiet hours apply. Notification content uses private lock-screen visibility, allowing the alert to appear while letting the operating system protect its contents according to the user's lock-screen settings.

## Operational requirements

- Production API instances set `FCM_TRANSPORT=fcm` and provide a Firebase service account and project ID.
- Queue workers must run continuously; push delivery is queued and retried.
- The Android release must contain the matching Firebase `google-services.json`.
- Users must grant notification permission. Device sound, Do Not Disturb, force-stop behavior, and vendor battery controls remain under operating-system/user control.

## Consequences

Push delivery works independently of the WebView and Socket.IO connection. Stable channel IDs let users control sound per notification family. Channel sound behavior cannot be silently overwritten after Android creates a channel, so future sound-policy changes require a new channel ID or explicit user action.
