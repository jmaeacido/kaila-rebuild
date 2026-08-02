# Decision 0034: Messenger-style wake-and-persist incoming calls

## Status

Accepted — 2026-08-02

## Context

Decision 0015 routed incoming calls through a privacy-safe tray notification that
opened the hired-job conversation. ADR-0011 and ADR-0022 prohibited full-screen
intents and persistent call-style alerts for the pilot. That design cannot wake a
locked device or present an answer UI when the app is closed or the user is not on
the chat page.

Product requirement: hired-job calls must behave like Messenger / classic phone
calls — wake the device when locked, ring when the app is closed, and remain
usable outside the conversation page.

## Decision

- Authorized incoming calls use Android full-screen intent + a ringtone channel
  (`kaila_calls_v2`) with `CATEGORY_CALL` notifications. This narrowly supersedes
  ADR-0011 / ADR-0022 for **`call.ringing` only**.
- FCM delivers call wake-ups as high-priority **data-primary** payloads with a short
  TTL so a custom `FirebaseMessagingService` can present the native incoming-call
  UI when the process is backgrounded or killed.
- Incoming call alerts **bypass quiet hours**. Other notification families keep
  quiet-hours silencing.
- WebRTC session state, signal polling, and the call overlay live in an app-wide
  authenticated `CallProvider`, not only on the conversation page. Leaving chat
  does not end an active call.
- While a call is active, Android runs a microphone/camera foreground service so
  media can continue when the app is backgrounded.
- Decision 0015’s tap-to-open-conversation path remains a fallback when full-screen
  intent is denied by the OS or user; answering still hydrates the global call UI.
- Managed TURN remains a hard runtime gate. Android 14+ full-screen-intent
  eligibility, Play Data Safety, and physical-device validation remain release gates.
- Android Telecom `ConnectionService` and iOS CallKit are out of scope.

## Consequences

- `docs/decisions/0015-android-messaging-and-webrtc.md` is superseded for incoming
  call presentation (see that file’s status).
- Channel `kaila_calls` is retained for compatibility; new installs and call wake
  use `kaila_calls_v2` with ringtone audio attributes.
- OEM battery restrictions may still suppress wake-up; document as OS limitation.
