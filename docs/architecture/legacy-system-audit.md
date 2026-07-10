# Legacy System Audit

## Scope and evidence standard

This audit covers the runnable legacy repository at `C:\laragon\www\kaila-old`. It was inspected read-only on 2026-07-10. Claims below cite repository-relative paths and, where useful, functions, routes, tables, or event names. The database dump (`kaila_mvp.sql`) is only a snapshot; runtime schema authority is `socket/server.js:initializeDatabase()` (`AGENTS.md`, `socket/server.js:799`). Founder-package documents and marketing screenshots are not runtime code.

The legacy system is not a PHP application. No PHP files exist in the inspected runtime repository. It is a static browser PWA, a Node.js service, MySQL, and a Capacitor Android wrapper (`AGENTS.md`; `package.json`; `socket/package.json`). This differs from the rebuild target in `AGENTS.md`, which requires Next.js/TypeScript plus Laravel REST API.

## Technology and dependency inventory

| Layer | Verified implementation | Evidence |
| --- | --- | --- |
| Browser client | Frameworkless SPA/PWA; one HTML shell, one 658 KB JavaScript file, one 259 KB stylesheet | `index.html`, `app.js`, `style.css`, `sw.js`, `manifest.webmanifest` |
| Browser libraries | Bootstrap, Font Awesome, SweetAlert2, SheetJS, Socket.IO client, Google Identity; loaded from script/link tags | `index.html` |
| API/runtime | Node.js, Express 5, Socket.IO 4, `mysql2`, `cors`, `dotenv`, Google auth library | `socket/package.json`, `socket/server.js:1-24` |
| Persistence | MySQL database `kaila_mvp`; schema created and altered at process startup | `socket/server.js:799-1442` |
| Realtime | Two Socket.IO servers on `/socket.io` and `/kaila-api/socket.io` | `socket/server.js:20-29`, `registerSocketHandlers()` |
| Push | Firebase Admin in Node; FCM receiver and notification channels on Android | root `package.json`, `socket/server.js:215 initializePushMessaging`, `android/.../KailaMessagingService.java` |
| Native | Capacitor 8 Android wrapper, custom `KailaNative` plugin | `capacitor.config.json`, `scripts/prepare-capacitor-web.js`, `android/app/src/main/java/com/kaila/marketplace/` |
| Calls | WebRTC signaling over Socket.IO; STUN by default, optional TURN | `socket/server.js:234 parseIceServers`, `kaila.call.signal`, `app.js:8735`, `app.js:12542` |
| Maps/routes | Browser geolocation and Leaflet-style map UI; OSRM route service by default | `app.js:12106-12283`, `socket/server.js:48`, `lookupRouteDistanceKm()` |
| AI/admin assistance | Optional Groq calls for validation, analytics, and in-app assistant | `socket/server.js:374 groqChatJson`, routes `/api/validation/decision-signal`, `/api/analytics/insights`, `/api/assistant/chat` |

There is no frontend build step (`AGENTS.md`). Playwright is only a root development dependency; no automated runtime test suite was found in the core service (`package.json`, `socket/package.json`).

## Entry points and deployment

- `index.html` is the only browser application shell. `APP_ROUTES` in `app.js:46` recognizes `landing`, `register`, `login`, `privacy`, `terms`, `support`, `public-post`, and `app`; `routeFromLocation()` reads `?route=` or the URL hash (`app.js:1208-1225`).
- `app.js` owns state, rendering, API access, auth screens, role dashboards, marketplace workflows, messaging, navigation, notifications, and calls. This is a monolith with tightly coupled presentation/domain/network code.
- `socket/server.js` is the sole API, schema bootstrap, job scheduler, Socket.IO, file-serving, encryption, push, AI, and WebRTC signaling process. `npm start` runs it (`socket/package.json`).
- `sw.js` caches the application shell. `scripts/prepare-capacitor-web.js` copies web files to generated `native-www/`; Capacitor then packages `android/` (`package.json`).
- Nginx production/proxy behavior is described by `deploy/nginx/kaila-https.conf`. The Capacitor client defaults to `https://kaila-app.com/kaila-api` (`AGENTS.md`).

## Authentication and authorization

### Verified behavior

- Passwords use per-password random salts and `crypto.scryptSync` through `passwordHash()`/`verifyPassword()` (`socket/server.js:688-697`). Registration permits `client` and `provider`; admin creation can add `admin`, `ops`, and `customer_service` (`createAccount()`, `/api/register`, `/api/admin/users`).
- Google ID tokens are verified with `google-auth-library`; Facebook access tokens are checked against Facebook endpoints using app credentials (`verifyGoogleCredential()`, `verifyFacebookAccessToken()`, `/api/auth/social`).
- Self-service password reset is intentionally disabled (`POST /api/forgot-password`, HTTP 410).
- Account deletion anonymizes `users`, deletes push tokens/blocks, and marks the provider profile deleted while retaining operational records (`DELETE /api/account`). Admin status controls support activate, deactivate, ban, and anonymized delete (`POST /api/admin/users/:id/status`).
- `admin`, `ops`, and `customer_service` are distinguished by `isStaffRole()` and route checks. A username constant, `jmaeacido`, is forcibly retained as active admin by `ensureSuperAdminAccount()` (`socket/server.js:37`, `3594`).

### Critical authorization defects

1. `requireUser()` authenticates solely by the caller-controlled `x-kaila-user-id` header and performs no session/token verification (`socket/server.js:4051`). Anyone who learns a user ID can impersonate that user, including staff.
2. Socket `identify` accepts a raw user ID and joins `user:<id>` without a signed handshake (`registerSocketHandlers()`, `socket/server.js:5895`).
3. `subscribe` accepts any channel and allows joining the global `kaila-mvp` room (`socket/server.js:5889`). Many `broadcast()` events go to that room and can expose cross-user activity/state deltas (`socket/server.js:4045`).
4. `KAILA_SOCKET_BEARER_TOKEN` is read into `SOCKET_TOKEN` but never used (`socket/server.js:38`; only occurrence). Its default value therefore provides no protection.
5. CORS is unrestricted for HTTP and Socket.IO (`app.use(cors())`, Socket.IO `origin: "*"`; `socket/server.js:21-25`, `112`).
6. Media GET routes (`/media/:id`, `/direct-media/:id`, `/message-media/:id`, `/profile-media/:id`, `/feed-media/:id`) do not use `requireUser` or object authorization (`socket/server.js:4079-4118`). IDs are opaque but are not access control.
7. `/api/state` is public (`socket/server.js:4119`) and calls `getState()` without a viewer. `getState()` treats no viewer as able to see all request rows (`socket/server.js:3218`), creating a likely data-exposure path.

The rebuild must replace these mechanisms before migrating user data or exposing any endpoint.

## Roles and behavior

| Role/profile | Verified capabilities | Evidence |
| --- | --- | --- |
| Client | Register/login; post/edit jobs; receive offers; select provider; cancel; confirm completion; rate provider; dispute; request revision; chat/call after acceptance | `/api/register`, `/api/requests*`, `canReadConversation()`, `canWriteConversation()` |
| Provider role | Includes marketplace-account behavior plus a provider profile; receives category/city-matched opportunities; offer/counter/pass; start work; share travel; submit proof/complete; rate client; dispute | `canUseMarketplaceRole()`, `activeProviderProfileFor()`, `providerMatchesRequestRow()`, request routes |
| Client with provider profile | Admin can add a provider profile to a client; `canUseMarketplaceRole()` and profile lookup permit dual-sided marketplace behavior | `/api/admin/users/:id/provider-profile`, `saveProviderProfileForUser()` |
| Admin | Account/provider management, analytics, feed official posting/moderation, audit visibility, destructive truncate; explicitly cannot execute job actions | `/api/admin/*`, `/api/analytics/insights`, `/api/requests/:id/action` |
| Ops | Validation surveys/interviews and AI decision signal; state is deliberately restricted | `/api/validation*`, `getState()` ops branch around `socket/server.js:3182` |
| Customer service | Report triage, dispute outcomes, scoped conversation access with audit records, direct assistance | `/api/reports/:id/action`, support actions in `/api/requests/:id/action`, `supportCanViewRequestConversation()`, `auditConversationAccess()` |

Provider matching is based on normalized categories plus same city/municipality derived from the area/coverage strings (`canonicalCategory()`, `sameCityArea()`, `providerMatchesRequestRow()`). It is not a geospatial service-area model.

## Marketplace lifecycle

The actual legacy statuses are more complex than the seven-stage target design:

`Posted` -> `Offers Received` or `Countered` -> `Accepted` -> `In Progress` -> `Provider Marked Done` -> `Payment Released` -> `Rated / Closed`.

Branches include `Revision Requested`, `Cancelled`, `Disputed`, and support outcome `Resolved` (`POST /api/requests/:id/action`, `socket/server.js:5174-5272`). The authoritative target PDD instead names Posted, Offers Received, Provider Selected, Provider Traveling, Working, Completed, Rated. Status normalization needs owner approval; do not copy legacy strings directly.

- A request requires category, details, a pinned coordinate, permission to forward, and rating consent. Scheduled jobs require date/time (`POST /api/requests`, `socket/server.js:4938`).
- Providers may offer only while open, only outside their own request, with an active matching profile, schedule, amount, and current location if the job has coordinates (`POST /api/requests/:id/offers`).
- Each provider has at most one current offer because a new offer deletes the prior row. `type` is `offer` or `counter`; there is no negotiation history or client-authored counteroffer (`socket/server.js:5082-5086`).
- Passing records `(request_id, provider_id)`, deletes that provider's offer, and recalculates the request status (`/pass`).
- Client confirmation chooses an offer and stores `accepted_provider_id`; messaging opens after selection (`/confirm`, `canReadConversation()`).
- Provider completion can include evidence and starts a 48-hour default auto-confirm timer. Client may confirm/release, request revision, or dispute. `autoConfirmExpiredJobs()` releases payment state automatically (`socket/server.js:3559`). No payment gateway or ledger is implemented; “Payment Released” is only a status/timestamp.
- Both parties can rate once within a seven-day default window. Both ratings close immediately; otherwise `closeExpiredRatingWindows()` closes the window (`socket/server.js:3543`). Reputation is calculated from completed request rows in `buildReputations()`.
- Cancellation is client-only and allowed until the listed terminal/late statuses. The guard checks legacy string `Rated`, although the actual closed status is `Rated / Closed`, an inconsistency (`socket/server.js:5215-5218`).

## Messaging and calls

- Job conversations are stored in `job_messages`; direct conversations use `direct_messages`. Both support attachments and `kind='call'`; job messages additionally support reactions (`socket/server.js:1113-1183`).
- Message text and call metadata use AES-256-GCM-like authenticated encryption implemented by `encryptMessage()`/`decryptMessage()` with a stable 64-hex environment key (`socket/server.js:209`, `451-467`). Losing or rotating the single key without migration makes history unreadable.
- Job chat is limited to accepted client/provider, disputed-job support, or admin. Customer-service access is logged in `conversation_access_audit` (`canReadConversation()`, `auditConversationAccess()`). Direct chat permissions are role-sensitive and blocked-user aware (`canOpenDirectConversation()`, `canWriteDirectConversation()`).
- Presence/typing state is process-memory only (`conversationPresence`, `directConversationPresence`; routes `/typing`, `/presence`). It is lost on restart and cannot scale across instances.
- Calls use WebRTC with Socket.IO signaling event `kaila.call.signal`; missed and completed calls become message records and missed-call notifications (`recordMissedCall()`, `recordCallLogMessage()`, socket handlers).

## Location and maps

- Job and offer coordinates are stored directly on `requests` and `offers`. Route distance uses a configurable OSRM endpoint and a process-memory cache (`lookupRouteDistanceKm()`, `GET /api/route-distance`).
- Accepted providers start, update, and stop travel using Socket.IO. `job_navigation_states` persists current state, location, ETA/distance, timestamps, and arrival state. Updates are throttled to at least 5 seconds and 10 meters; “nearby” is 100 m and “arrived” is 30 m (`socket/server.js:104-110`, `saveNavigationLocation()`).
- Only assigned providers can publish. Client, provider, admin, and scoped customer service can receive exact navigation (`navigationRecipientIds()`, `canReceiveNavigation()`).
- The target PDD includes “Provider Traveling” as a job stage, but legacy navigation is a side-state and does not change `requests.status`. This conflict requires a deliberate state-machine design.

## Uploads and storage

- Request/completion/dispute media, message media, feed media, and profile photos are base64 JSON payloads decoded in the Node process (`decodeAttachment()`, `decodeProfilePhoto()`). Request body limit is 35 MB; individual media limit 10 MB, profile image 2 MB, and stage limit 20 (`socket/server.js:53-67`, `112`).
- Allowed content types are JPEG, PNG, WebP, MP4, and WebM; signatures are checked in `matchesMediaSignature()`. Files are renamed and stored on local disk in `uploads/` or `profile-photos/`; metadata is stored in MySQL (`saveAttachments()`, `saveDirectAttachments()`, `saveJobMessageAttachments()`, `saveFeedMedia()`).
- Local disk makes horizontal scaling, backups, malware processing, retention, and CDN delivery unresolved. The rebuild should use private object storage, signed access, asynchronous scanning, lifecycle rules, and explicit ownership checks.

## Notifications

FCM tokens are registered by `POST /api/push-token`. Node initializes Firebase Admin from JSON or application-default credentials (`initializePushMessaging()`) and sends targeted data/notification payloads through `pushNotification()`. Verified notification triggers include new matching request, offer/counteroffer, accepted offer, job/direct message, missed call, and feed activity (`sendPushToUsers()`, request routes, message routes, `createFeedNotification()`). Invalid tokens are removed after send failures (`sendPushToUsers()`). Android defines separate call, general alert, and persistent job-request channels (`KailaMessagingService.java`). Full details and event payloads are in `realtime-and-notification-audit.md`.

## Admin, public, and ancillary functionality

- Admin functionality includes account CRUD/status, adding provider profiles to clients, audit logs, analytics, validation, report moderation, official feed posts, feed moderation, and complete database truncation (`/api/admin/*`, `/api/analytics/insights`, `/api/validation*`, feed routes).
- Customer service resolves disputes and triages reports; ops records validation research.
- Public routes include root health/config endpoints, public media endpoints, `/api/public-post/:id`, and app routes for landing/privacy/terms/support/public-post. Public feed links use `?route=public-post&post=<id>` and Web Share/Facebook share (`app.js:2167`, `2582-2612`, `3339-3366`).
- Mobile update metadata and APK redirects are served by `/api/mobile-update` and `/api/mobile-update/apk` (`readMobileUpdateMetadata()`).
- The social feed (posts, nested comments/replies, reactions, media-specific interaction, mentions, shares, moderation) is a large adjacent subsystem (`feed_*` tables; `/api/feed*`).
- The Groq “Katabang” assistant and validation/analytics suggestions are optional, server-side features (`/api/assistant/chat`, `/api/validation/decision-signal`, `/api/analytics/insights`).

## Duplication, obsolete code, and maintainability

- `app.js` and `style.css` are oversized monoliths. Generated `native-www/` duplicates the root PWA by design. `android/` includes generated Capacitor code plus custom native classes (`AGENTS.md`, `scripts/prepare-capacitor-web.js`).
- Schema evolution is embedded as repeated startup `CREATE TABLE`, `ensureColumn`, `ALTER TABLE`, data backfills, and cleanup. There are no versioned migrations or transactional migration history (`initializeDatabase()`).
- `requests.rating_score`/`rating_note` coexist with newer bilateral client/provider rating fields but are not the active write path (`requests` schema, `/action rate`).
- Request status `Open` is referenced in an active-status set although creation uses `Posted`; cancellation checks `Rated` although closure uses `Rated / Closed` (`socket/server.js:338`, `4966`, `5216`).
- Offer replacement destroys price negotiation history. `counter` is simply provider-authored offer type, not a two-sided counteroffer chain.
- `activities` is a global event log mixed with user notifications; `broadcast()` often emits globally. Separate domain events, audit records, and user notifications in the rebuild.
- `providers` duplicates name/category/area from `users`, and `requests`/`offers` snapshot names without an explicit snapshot policy. Several structured concepts are stored as text (`skills`, coverage, services, prices, work samples).
- The checked-in Android tree is generated but contains material custom behavior; migration must extract the custom notification/deep-link requirements rather than copy the entire tree.

## Security and operational risk register

| Severity | Risk | Evidence / consequence |
| --- | --- | --- |
| Critical | Header/socket user-ID impersonation | `requireUser()`, socket `identify`; total account takeover possible |
| Critical | Public full-state exposure | unauthenticated `GET /api/state`, `getState()` no-viewer path |
| High | Unauthenticated object media | media GET routes lack authorization |
| High | Global unauthenticated realtime subscription | `subscribe`, `CHANNEL`, `broadcast()` |
| High | No rate limiting, login throttling, CSRF/session model, or abuse controls found | Express middleware and auth routes |
| High | Admin destructive truncate endpoint | `POST /api/admin/truncate`; compromised admin can erase core data |
| High | Local files and one encryption key | upload paths; `MESSAGE_ENCRYPTION_KEY`; weak resilience/rotation |
| Medium | Default STUN only | `DEFAULT_ICE_SERVERS`; calls may fail behind restrictive NAT without TURN |
| Medium | In-memory presence/call/cache/rate state | process globals; restart and multi-instance inconsistency |
| Medium | Runtime DDL on startup | `initializeDatabase()`; deployment races and rollback uncertainty |
| Medium | “Payment Released” without payment records | request status fields only; financial meaning can be misleading |
| Medium | Broad data assembly in `/api/state` | large coupled payload, authorization complexity, overfetching |
| Medium | No core automated tests found | root/socket package scripts |

## Conflicts with authoritative rebuild documents

1. Legacy UI uses Bootstrap and Font Awesome; the rebuild requires KAILA tokens and Lucide only.
2. Legacy architecture is static JS + Node; the required target is Next.js/TypeScript + Laravel REST + separate Socket.IO.
3. Legacy job statuses do not map one-to-one to the PDD’s seven stages, especially traveling, completion/payment, revision, dispute, and cancellation.
4. Legacy permits a client account to gain a provider profile. The PDD describes client/provider navigation separately but does not decide whether one account can switch modes.
5. Legacy includes a social feed, direct calling, AI assistant, validation suite, analytics, APK self-update, and staff roles not explicitly prioritized by the PDD.

These are documented planning conflicts; no code or screen redesign was performed.
