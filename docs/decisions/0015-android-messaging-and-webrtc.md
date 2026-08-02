# Decision 0015: Android messaging and WebRTC calls

## Status

Superseded in part — 2026-08-02

Incoming call presentation is superseded by
[Decision 0034](0034-messenger-style-incoming-calls.md). Camera/microphone
permissions, push token registration, bearer-auth call routes, and job-participant
authorization below remain in force.

## Context

The Capacitor application loads the authenticated KAILA web experience from the
approved HTTPS origin. Job messaging and WebRTC calls therefore share the browser
implementation, server authorization, REST reconciliation, and Socket.IO invalidation.
Android still requires manifest permissions and native lifecycle routing that desktop
browsers do not.

## Decision

- Android declares camera, microphone, and audio-routing permissions. Camera and
  microphone hardware remain optional so chat and audio calling are not excluded
  from otherwise supported devices.
- Push tokens are registered using a stored mobile bearer session when one exists,
  otherwise through the authenticated embedded-web cookie session.
- ~~An incoming hired-job call creates a privacy-safe durable notification. A
  notification tap or foreground `call.ringing` event opens the authorized hired-job
  conversation, where the existing WebRTC UI obtains runtime media consent.~~
  **Superseded:** Decision 0034 — native full-screen / ringtone wake plus a global
  in-app `CallProvider` overlay. Tap-to-open conversation remains a fallback when
  full-screen intent is unavailable.
- Mobile bearer-auth routes expose the same TURN configuration, signal queue,
  signal-state recovery, SDP/ICE relay, and call transitions as browser sessions.
- Calling remains limited to authorized job participants in the consumer Android UI.

## Consequences

Foreground messages update through Socket.IO and REST reconciliation, background
messages arrive through FCM, and incoming calls can wake Android users to a native
answer UI or the global WebRTC overlay. Calls still depend on managed TURN
availability and Android users granting camera/microphone permission at the point
of use.
