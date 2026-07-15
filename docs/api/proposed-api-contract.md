# Proposed API Contract

## Status and principles

This is a planning contract, not an implementation. It translates verified legacy behavior into the required Laravel REST API and separates it from Socket.IO realtime delivery. Endpoint names, schemas, permissions, and idempotency rules must be reviewed before code generation.

Proposed base: `/api/v1`. JSON uses camelCase externally and Laravel-native naming internally. Use authenticated, short-lived access credentials with rotating/revocable refresh sessions; never accept `x-kaila-user-id` as identity (legacy `socket/server.js:4051`). Authorization is object- and action-specific on the server.

Common response envelope:

```json
{"data": {}, "meta": {}, "links": {}}
```

Errors use an HTTP status plus stable code:

```json
{"error":{"code":"JOB_TRANSITION_NOT_ALLOWED","message":"This job cannot be completed yet.","fields":{}}}
```

Collection endpoints use cursor pagination and explicit filters. Mutating endpoints accept `Idempotency-Key`. Optimistic concurrency should use a resource version or `If-Match`. Dates are ISO 8601 UTC; money is integer minor units plus ISO currency. Coordinates must not be returned unless the viewer is authorized for the active job.

## Authentication and sessions

| Method | Endpoint | Purpose | Access |
| --- | --- | --- | --- |
| POST | `/auth/register` | Register client or provider-intent account; capture policy versions/consents | Public |
| POST | `/auth/login` | Password login, rate-limited | Public |
| POST | `/auth/social/{provider}` | Verify Google/Facebook credential then create/link/login | Public |
| POST | `/auth/refresh` | Rotate refresh session | Refresh session |
| POST | `/auth/logout` | Revoke current session | User |
| POST | `/auth/logout-all` | Revoke all sessions | User |
| POST | `/auth/password/forgot` | Start verified recovery | Public |
| POST | `/auth/password/reset` | Consume one-time reset token | Public |
| GET | `/me` | Current user, modes, permissions, profile completion | User |
| PATCH | `/me` | Update permitted profile/contact fields | User |
| DELETE | `/me` | Request account deletion/anonymization | User |
| GET/DELETE | `/me/sessions[/{id}]` | List/revoke devices | User |

Legacy basis: `/api/register`, `/api/login`, `/api/auth/social*`, `/api/profile`, `/api/account`. The rebuild adds real sessions and recovery; legacy forgot-password is disabled.

## Taxonomy, locations, and discovery

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/service-categories` | Versioned category/service taxonomy |
| GET | `/locations/regions` | Geographic hierarchy |
| GET | `/locations/regions/{id}/localities` | Cities/municipalities |
| GET | `/locations/localities/{id}/areas` | Barangays/neighborhoods where available |
| GET | `/providers` | Search by service, service area, availability, distance, rating |
| GET | `/providers/{id}` | Public profile, services, approved credentials, portfolio, reputation |

This replaces legacy string matching in `normalizeCategories()` and `providerMatchesRequestRow()` and spreadsheet/hardcoded city lists.

## Provider profile

| Method | Endpoint | Purpose | Access |
| --- | --- | --- | --- |
| POST | `/provider-profiles` | Enable provider mode and create draft | Eligible user |
| GET | `/provider-profile` | Own full profile and review state | Provider |
| PATCH | `/provider-profile` | Edit services, area, availability, prices, bio | Provider |
| POST/DELETE | `/provider-profile/portfolio[/{assetId}]` | Manage work samples | Provider |
| POST | `/provider-profile/credentials` | Submit verification evidence | Provider |
| PATCH | `/provider-profile/availability` | Update working availability | Provider |

ADR-0001 approves one identity with switchable Client and Provider modes. Legacy admins can add a provider profile to a client (`/api/admin/users/:id/provider-profile`); the rebuild instead authorizes provider actions from provider eligibility and resource policy, never from the selected UI mode alone.

## Jobs

Use `jobs` rather than legacy `requests` externally. Proposed canonical primary stages are `posted`, `offers_received`, `provider_selected`, `provider_traveling`, `working`, `completed`, `rated`, matching the PDD. Branch/outcome fields handle `cancelled` and `disputed`; revision and payment states require approval before final schema.

| Method | Endpoint | Purpose | Main authorization |
| --- | --- | --- | --- |
| POST | `/jobs` | Post job brief, schedule, budget, location reference, initial assets | Client mode |
| GET | `/jobs` | Role-scoped list; filters by relationship/state | User |
| GET | `/jobs/{id}` | Authorized job detail and permitted actions | Related/matched user or scoped staff |
| PATCH | `/jobs/{id}` | Edit while still open and unassigned | Owner |
| POST | `/jobs/{id}/cancel` | Cancel with reason | Owner; policy/state guarded |
| GET | `/opportunities` | Provider-matched open jobs, location minimized | Provider |
| POST | `/jobs/{id}/pass` | Dismiss opportunity | Matched provider |
| POST | `/jobs/{id}/select-offer` | Assign selected offer/provider atomically | Owner |
| POST | `/jobs/{id}/start-work` | Transition selected/travel stage to working | Assigned provider |
| POST | `/jobs/{id}/submit-completion` | Proof and completion request | Assigned provider |
| POST | `/jobs/{id}/request-revision` | Return completion for revision | Owner |
| POST | `/jobs/{id}/confirm-completion` | Confirm service completion | Owner |
| GET | `/jobs/{id}/timeline` | Immutable status/event history | Related user/staff |

`POST /jobs` accepts references to pre-uploaded assets, not base64 blobs. It stores a structured locality and separately protected exact location. The API computes allowed transitions; the client never supplies a target status. Legacy basis: `/api/requests`, `/confirm`, `/action` (`server.js:4938-5300`).

## Offers and negotiation

| Method | Endpoint | Purpose | Access |
| --- | --- | --- | --- |
| GET | `/jobs/{jobId}/offers` | Owner sees comparable offers; provider sees own thread | Owner/participating provider |
| POST | `/jobs/{jobId}/offers` | Create initial offer | Matched provider |
| GET | `/offers/{id}` | Offer and immutable revision history | Participants |
| POST | `/offers/{id}/revisions` | Counter/revise with actor, amount, availability, note | Participants, policy guarded |
| POST | `/offers/{id}/withdraw` | Withdraw before selection | Offering provider |
| POST | `/offers/{id}/decline` | Decline an offer/revision | Recipient |

Legacy only replaces a provider’s current row and labels provider submissions `offer`/`counter` (`server.js:5054-5102`). The proposed revision resource preserves negotiation history. Whether clients may counter is an owner decision.

## Travel and maps

| Method | Endpoint | Purpose |
| --- | --- |
| POST | `/jobs/{id}/travel/start` | Authorize a short-lived location-sharing session and transition stage |
| POST | `/jobs/{id}/travel/stop` | Stop sharing and close session |
| GET | `/jobs/{id}/travel` | Current authorized location/ETA snapshot |
| GET | `/routes/estimate?jobId=...` | Server-derived distance/ETA without exposing arbitrary proxy access |

Frequent coordinates travel over authenticated Socket.IO event `travel.location.update`, with server validation and periodic persistence. REST provides reconciliation. Legacy basis: `/api/navigation/:requestId`, `/api/route-distance`, `kaila.navigation.*`, `job_navigation_states`.

## Conversations and calls

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/conversations` | Authorized job/support/direct conversation summaries |
| POST | `/conversations` | Create only an allowed direct/support context |
| GET | `/conversations/{id}/messages` | Cursor-paginated history |
| POST | `/conversations/{id}/messages` | Send text with asset references |
| POST | `/messages/{id}/reactions` | Add/replace reaction |
| DELETE | `/messages/{id}/reactions/{reaction}` | Remove own reaction |
| POST | `/conversations/{id}/read` | Advance read watermark |
| POST | `/calls` | Create authorized call session |
| POST | `/calls/{id}/end` | Finalize call outcome/log |

Typing, presence, message delivery, and WebRTC signaling use authenticated realtime events. Support conversation reads require a reason and append an access audit, preserving legacy `conversation_access_audit` behavior.

## Completion, reviews, disputes, and payments

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/jobs/{id}/reviews` | One review by each participant within policy window |
| GET | `/providers/{id}/reviews` | Public provider reviews with moderation state |
| POST | `/jobs/{id}/disputes` | Open case with reason and evidence |
| GET | `/disputes/{id}` | Participant/staff case timeline |
| POST | `/disputes/{id}/messages` | Case-specific communication/evidence |
| POST | `/disputes/{id}/withdraw` | Withdraw if policy permits |
| POST | `/admin/disputes/{id}/assign` | Assign support owner |
| POST | `/admin/disputes/{id}/decisions` | Append structured decision/outcome |

Payment endpoints are intentionally excluded under ADR-0002. Legacy “Payment Released” is only request state/timestamps (`/api/requests/:id/action`) and must not be represented as a real transfer.

## Assets

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/assets/uploads` | Create scoped upload intent/presigned URL |
| POST | `/assets/{id}/complete` | Confirm upload and enqueue validation/scanning |
| GET | `/assets/{id}` | Return metadata and authorized signed download URL |
| DELETE | `/assets/{id}` | Delete unattached/allowed asset |

Never expose local filenames or unauthenticated media routes. Enforce purpose (`jobBrief`, `completionEvidence`, `disputeEvidence`, `message`, `portfolio`, `avatar`), owner, MIME signature, size, scan state, and retention.

## Notifications and devices

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/devices` | Register/update FCM token and device metadata |
| DELETE | `/devices/{id}` | Revoke device token |
| GET | `/notifications` | Durable user notification inbox |
| POST | `/notifications/read` | Mark selected/all read |
| GET/PATCH | `/notification-preferences` | Per-channel/type preferences |

Legacy basis: `/api/push-token`, `/api/push-status`, `/api/notification-summary`, `/api/notification-read`. Calls, messages, jobs, and offers create typed durable notification records; Socket.IO and FCM are delivery channels, not sources of truth.

## Trust and safety

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/reports` | Report a user, job, message, review, or feed item |
| GET | `/reports` | Reporter sees own report statuses |
| POST/DELETE | `/blocks/{userId}` | Block/unblock user |
| GET | `/blocks` | List blocks |
| GET | `/safety/policies` | Current policy links/versions |

Staff routes: `GET /admin/reports`, `POST /admin/reports/{id}/assign`, `POST /admin/reports/{id}/decisions`, and audit endpoints. Replace free-form status updates with assigned cases and structured decisions.

## Administration

Administrative API and UI must be structurally separate from consumer applications.

Proposed resources: `/admin/users`, `/admin/provider-verifications`, `/admin/reports`, `/admin/disputes`, `/admin/audit-logs`, `/admin/service-categories`, `/admin/locations`, and `/admin/feature-flags`. Permissions must be granular; super-admin identity must not depend on a hardcoded username. No production truncate endpoint should exist.

Ops validation, AI analytics/assistant, social feed, and mobile APK update endpoints are deferred contracts pending feature approval. If retained, they should be separate modules, not part of the core marketplace state response.

## Realtime contract boundary

Socket connection authentication uses a signed access token at handshake and server-assigned rooms. Clients cannot choose arbitrary rooms or identify as a raw user ID. Every event has `eventId`, `occurredAt`, `resourceType`, `resourceId`, `version`, and minimal authorized `data`.

Proposed pilot server events: `job.created`, `job.updated`, `job.stage.changed`, `offer.created`, `offer.revised`, `offer.selected`, `message.created`, `message.reaction.changed`, `conversation.typing.changed`, `travel.started`, `travel.location.changed`, `travel.arrival.changed`, `travel.stopped`, and `notification.created`. Clients reconcile by fetching the REST resource when versions skip or reconnect occurs.

Client events are commands only where low latency is necessary: typing/presence and travel coordinate updates. Business transitions remain authenticated REST commands so Laravel owns validation and persistence. Call signaling is deferred.

## Phase 0 contract decisions

- One account has switchable modes under ADR-0001.
- The accepted canonical state machine governs traveling, revision, cancellation, disputes, and completion.
- KAILA-processed payments are excluded under ADR-0002.
- Counterproposals and binding revisions follow ADR-0004.
- Direct messaging/calling before hire is deferred; hired-job messaging and audited staff access follow ADR-0011.
- Location sharing, foreground collection, retention, and consent follow ADR-0007 and ADR-0011.
- Feed, AI, operations validation, APK self-update, calls, background location, and advanced analytics are deferred under ADR-0008 and ADR-0011.
