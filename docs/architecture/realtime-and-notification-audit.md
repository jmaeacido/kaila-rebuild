# Realtime and Notification Audit

## Legacy topology

`socket/server.js` creates two Socket.IO servers on one HTTP server: default path and proxied `/kaila-api/socket.io` (`server.js:20-29`). The browser initializes a socket, subscribes to global room `kaila-mvp`, and later identifies the signed-in user (`app.js:10567-10736`). HTTP mutations generally persist to MySQL and then broadcast an event.

Authoritative business state remains MySQL in intent, but legacy clients frequently consume broad event payloads and `/api/state`. Presence, active calls, route cache, update throttles, and Firebase runtime are process memory (`server.js:94-102`). Multi-instance coordination is absent.

## Authentication and room security

- `subscribe(channel)` joins any caller-supplied room and emits `kaila.socket.ready`.
- `identify(userId)` trusts a raw user ID, joins `user:<id>`, restores navigation, and replays ringing calls.
- No Socket.IO auth middleware, signed token, origin restriction, or use of declared `SOCKET_TOKEN` was found (`registerSocketHandlers()`, `SOCKET_TOKEN` only at `server.js:38`).
- Global broadcasts use `broadcast()` -> room `kaila-mvp` (`server.js:4045`).

This is a critical confidentiality and impersonation risk. The rebuild must authenticate during handshake, derive identity server-side, assign rooms server-side, authorize every inbound event, and use per-resource rooms only after membership checks.

## Verified Socket.IO event catalog

### Connection/session events

| Direction | Event | Payload/behavior | Evidence |
| --- | --- | --- | --- |
| C -> S | `subscribe` | channel string; joins room | `server.js:5889` |
| S -> C | `kaila.socket.ready` | `{channel, socketId}` | `server.js:5892` |
| C -> S | `identify` | `userId`, acknowledgement | `server.js:5895` |
| S -> C | `kaila.socket.identified` | `{userId}` | `server.js:5905` |

### Marketplace/domain broadcasts

| Event | Verified producer/payload shape |
| --- | --- |
| `kaila.state.updated` | Broad state snapshot after registration/admin/profile/validation/feed-related mutations; `broadcast()` |
| `kaila.request.created` | `{request}` after job post (`/api/requests`) |
| `kaila.request.updated` | `{request}` after open-job edit |
| `kaila.provider.saved` | provider/profile save route |
| `kaila.offer.saved` | `{requestId, offer, status}` |
| `kaila.request.confirmed` | `{requestId, actorId}` |
| `kaila.request.passed` | `{requestId, providerId}` |
| `kaila.request.action` | `{requestId, action, status, actorId}`; scheduled closures omit actor |
| `kaila.activity` | global activity row from `addActivity()` |
| `kaila.validation.updated` | `{entryId, action}` |
| `kaila.moderation.reported` | report identifiers/type |

The browser listens for these at `app.js:10601-10665`. Broad state updates and global activities should be replaced by minimal authorized events with versions.

### Messaging/presence events

| Event | Payload/behavior | Evidence |
| --- | --- | --- |
| `kaila.message.saved` | `{requestId, message}` after job message/call log | `broadcast()`, message route, `recordCallLogMessage()` |
| `kaila.direct-message.saved` | `{userIds, message}` sent to participant rooms | `relayDirectEvent()` |
| `kaila.typing.changed` | job conversation typing data | `/api/requests/:id/typing` |
| `kaila.presence.changed` | job presence update | `/api/requests/:id/presence` |
| `kaila.direct-presence.changed` | direct participant presence | `/api/direct-conversations/:userId/presence` |
| `kaila.message.reaction` | includes `requestId`; client refetches conversation | message reaction route, `app.js:10636` |

Presence maps are not durable and do not have expiry/heartbeat semantics suitable for multiple nodes.

### Navigation events

Inbound payloads have `requestId` plus location where applicable; acknowledgements return `{ok, navigationState}` or error.

| Direction | Event | Key behavior |
| --- | --- | --- |
| C -> S / S -> C | `kaila.navigation.start` | Assigned provider starts persisted travel; recipients get state |
| C -> S / S -> C | `kaila.navigation.location` | Assigned provider update; throttled by 5 s/10 m; recipients get location |
| S -> C | `kaila.navigation.arrival_state` | Derived transition among waiting/on_the_way/nearby/arrived/paused/stopped |
| C -> S / S -> C | `kaila.navigation.stop` | Explicit or job-state auto-stop |
| S -> C | `kaila.navigation.state` | Restore/current snapshot on identify and REST reconciliation |

Evidence: `registerSocketHandlers()` (`server.js:5931-6035`), `saveNavigationStart/Location/Stop()`, `emitNavigationState()`, browser handlers `app.js:10639-10652`.

Only the accepted provider can send. Exact state recipients are calculated by `navigationRecipientIds()` and `canReceiveNavigation()`. However, insecure socket identification defeats these checks.

### Call signaling

| Direction | Event | Payload |
| --- | --- | --- |
| C -> S | `kaila.call.check` | request/direct context; checks target availability/authorization |
| C -> S / S -> C | `kaila.call.signal` | `requestId`, `directUserId`, `callId`, type, sender ID/name, SDP description, ICE candidate, video flag and call lifecycle data |
| S -> C | `kaila.missed-call.saved` | persisted missed-call summary |

Evidence: `server.js:6036-6224`, `relayCallSignal()`, `recordMissedCall()`, browser listener `app.js:10656`. Signal types include offer, answer, ICE candidate/lifecycle messages such as decline, hangup, busy/offline (socket handler branches). Active call state is memory-only; ring timeout defaults to 60 seconds and disconnect grace to 20 seconds (`server.js:42-44`).

Production requires TURN credentials, signaling authorization, abuse/rate limits, multi-node call state or sticky-session design, privacy policy, and Android background-call testing.

### Feed events

- `kaila.feed.updated` tells clients to refetch feed.
- `kaila.feed.notification` is emitted to `user:<recipientId>` with mapped notification.

Evidence: `createFeedNotification()` (`server.js:2247-2267`), feed routes, `app.js:10602-10623`.

## REST reconciliation

Legacy current state is fetched through `/api/state`, message endpoints, `/api/navigation/:requestId`, message/notification summaries, and feed endpoints. `/api/state` being public is a critical defect. The rebuild should use resource-specific REST endpoints with versions, then treat realtime as invalidation/minimal deltas:

1. Persist and commit domain change in Laravel.
2. Append an outbox event in the same transaction.
3. Relay the event through Socket.IO/queue workers.
4. Client applies only sequential versions; on a gap/reconnect, fetch the resource.
5. FCM notification references the resource/event and does not contain sensitive details beyond lock-screen policy.

## Firebase/FCM server behavior

`initializePushMessaging()` loads Firebase Admin, preferring `FIREBASE_SERVICE_ACCOUNT_JSON`, otherwise application-default credentials; failure disables push with a warning (`server.js:215-232`). `POST /api/push-token` upserts a token by SHA-256 hash with user/platform/device (`server.js:4647-4666`). `sendPushToUsers()` fetches tokens, sends multicast messages, and removes invalid/unregistered tokens (`server.js:1689-1750`).

Verified push categories/triggers:

| Trigger | Type/action examples | Recipients/evidence |
| --- | --- | --- |
| Matching job posted | type `request`, action `job-request`, persistent attention, 2-hour TTL | matched providers; `/api/requests` |
| Offer/counter | type `offer`, action `offer` | job client; `/offers` |
| Offer accepted | type `job`, action `job` | selected provider; `/confirm` |
| Job/direct message | message action and conversation identifiers | message POST routes |
| Missed call | type `call`, action `open-notifications` | target; `recordMissedCall()` |
| Feed interaction/mention | feed notification type and post/comment IDs | `createFeedNotification()` |
| Clear stale job alert | FCM data operation through `clearJobRequestNotification()` | providers after pass/select/terminal action |

The legacy does not maintain a general durable marketplace-notification table; `activities`, `missed_calls`, and `feed_notifications` feed summary endpoints. Rebuild needs one notification source of truth plus channel delivery attempts.

## Android notification behavior

- Root dependencies include Capacitor push/local-notification plugins and Firebase Admin; Android applies Google services (`package.json`, Android Gradle files).
- `KailaMessagingService.java` extends Firebase messaging service, creates call/general/job channels, routes launch actions, uses distinct sounds, and assigns stable job notification IDs for replacement/cancellation.
- Job-request notifications use a high-importance private-lockscreen channel and stronger vibration/sound. Call notifications use full-screen/call style when allowed.
- `KailaNativePlugin.java` exposes incoming-call display/cancel, job-notification cancel, launch-action consumption, Firebase availability, app info/update URL opening, and Facebook login handling.
- `AndroidManifest.xml` declares FCM service, deep link host `kaila-app.com`, notification/call/location/media permissions, and disables backup.

Open issues: Android 13+ notification permission UX, Android 14+ full-screen-intent eligibility, background location permission/service design, OEM battery restrictions, token refresh/account switching, privacy-safe lock-screen text, and Play policy compliance.

## Proposed event contract

Every server event should include:

```json
{
  "eventId": "evt_...",
  "type": "job.stage.changed",
  "occurredAt": "2026-07-10T00:00:00Z",
  "resource": {"type": "job", "id": "job_...", "version": 8},
  "data": {}
}
```

Recommended events: `job.created`, `job.updated`, `job.stage.changed`, `offer.created`, `offer.revised`, `offer.selected`, `conversation.message.created`, `conversation.typing.changed`, `travel.started`, `travel.location.changed`, `travel.arrival.changed`, `travel.stopped`, `call.signal`, and `notification.created`.

Inbound Socket.IO should be limited to latency-sensitive ephemeral commands: typing, bounded presence heartbeat, travel coordinates, and call signals. Job/offer/completion/dispute/rating transitions remain Laravel REST commands. Socket.IO must validate the access token, actor, resource membership, payload schema, rate, timestamp, and coordinate plausibility.

## Migration acceptance criteria

- A forged user ID cannot authenticate over HTTP or Socket.IO.
- No client can join arbitrary rooms; tests prove cross-job/cross-user isolation.
- Disconnect/reconnect and missed versions recover via REST without duplicated transitions.
- Laravel transaction/outbox prevents committed state without an eventual event.
- FCM failures do not roll back domain state; retries and invalid-token removal are observable.
- Location is visible only during the approved window to approved participants and is deleted/aggregated per policy.
- Push content respects lock-screen privacy and user preferences.
- Multi-instance Socket.IO/presence works through an approved adapter or documented sticky-session constraint.
- Calls work across representative mobile networks with TURN and record correct missed/ended outcomes.
- Automated contract, authorization, reconnect, notification, and Android lifecycle tests pass.

## Owner decisions

- Whether travel is foreground-only or supports background location, and retention duration.
- Which events warrant push, sounds, persistent alerts, and full-screen call UI.
- Whether direct messages/calls are allowed before hire.
- Whether social-feed notifications are launch scope.
- Notification quiet hours/preferences and staff escalation rules.
- Infrastructure choice for queues, Socket.IO adapter, TURN, FCM credential custody, and observability.
