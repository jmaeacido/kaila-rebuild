# Android call wake device matrix

Messenger-style incoming calls (Decision 0034) require physical-device validation before production promotion.

## Prerequisites

- `phase_nine.calls=true` and managed TURN (`WEBRTC_TURN_*`) configured
- Matching Firebase `google-services.json` and `FCM_TRANSPORT=fcm`
- Notification permission granted
- On Android 14+: full-screen intent allowed for KAILA (Settings → Special app access)

## Cases

| Case | Expected |
| --- | --- |
| App foreground on non-chat page | Global call overlay appears; no duplicate toast |
| App backgrounded | Ringtone channel `kaila_calls_v2` + full-screen / heads-up answer UI |
| Device locked | Screen wakes; IncomingCallActivity or full-screen intent shows Answer/Decline |
| App force-swiped / killed | Data-primary FCM still presents native incoming UI |
| Caller hangs up while ringing | Native ringing notification cancels via `action=cancel` |
| Answer accepted | WebView hydrates CallProvider, WebRTC connects, CallForegroundService starts |
| Leave chat during active call | Overlay remains; media continues |
| Background during active call | Ongoing “call in progress” notification; audio continues |
| Quiet hours enabled | Incoming call still rings; other notifications stay silent |
| Full-screen intent denied | Fallback heads-up / tray notification; tap opens call deep link |

## Known OS limits

OEM battery savers, Do Not Disturb / priority modes, and force-stop can still suppress wake-up. Document as user/OS limitation, not application failure.
