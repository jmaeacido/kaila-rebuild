# Background push notification delivery

## Decision

KAILA uses server-originated Firebase Cloud Messaging payloads for job requests, offers, job updates, messages, and calls. Socket.IO remains the foreground realtime path, but is not relied on when the app is inactive or closed.

Android notifications use stable channels created by the native Capacitor host:

- `kaila_updates`: audible, high-importance job requests, offers, and lifecycle updates
- `kaila_messages`: audible, high-importance messages
- `kaila_calls_v2`: ringtone-importance incoming-call alerts (full-screen eligible). Legacy `kaila_calls` remains for older installs but is not used for new call wake payloads.
- `kaila_silent`: quiet-hours delivery without sound or vibration

Non-call FCM payloads use high Android priority and the device's default notification sound unless quiet hours apply. Notification content uses private lock-screen visibility.

Incoming **calls** use high-priority **data-primary** FCM with a short TTL so the native messaging service can present a `CATEGORY_CALL` full-screen intent over the lock screen. Call alerts bypass quiet hours. See [Decision 0034](0034-messenger-style-incoming-calls.md).

## Operational requirements

- Production API instances set `FCM_TRANSPORT=fcm` and provide a Firebase service account and project ID.
- Queue workers must run continuously; push delivery is queued and retried.
- The Android release must contain the matching Firebase `google-services.json`.
- Users must grant notification permission. Device sound, Do Not Disturb, force-stop behavior, vendor battery controls, and Android 14+ full-screen-intent restrictions remain under operating-system/user control.

## Consequences

Push delivery works independently of the WebView and Socket.IO connection. Stable channel IDs let users control sound per notification family. Channel sound behavior cannot be silently overwritten after Android creates a channel, so ringtone policy uses `kaila_calls_v2` rather than mutating `kaila_calls`.
