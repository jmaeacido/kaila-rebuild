# Decision 0015: Android messaging and WebRTC calls

## Status

Accepted — 2026-07-31

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
- An incoming hired-job call creates a privacy-safe durable notification. A
  notification tap or foreground `call.ringing` event opens the authorized hired-job
  conversation, where the existing WebRTC UI obtains runtime media consent.
- Mobile bearer-auth routes expose the same TURN configuration, signal queue,
  signal-state recovery, SDP/ICE relay, and call transitions as browser sessions.
- Calling remains limited to authorized job participants in the consumer Android UI.

## Consequences

Foreground messages update through Socket.IO and REST reconciliation, background
messages arrive through FCM, and incoming calls can bring Android users to the answer
screen. Calls still depend on managed TURN availability and Android users granting
camera/microphone permission at the point of use.
