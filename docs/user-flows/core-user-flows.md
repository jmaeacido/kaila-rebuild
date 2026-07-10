# Core User Flows

## Purpose

These flows describe verified legacy behavior and the proposed rebuild boundary. They do not redesign screens. “Target” stages use the authoritative PDD; legacy state names are shown where they differ.

## 1. Registration and sign-in

1. User chooses client or provider intent.
2. User supplies name, username, password (or verified Google/Facebook identity), area, contact number, preferred contact channel, and privacy consent.
3. Provider registration additionally requires category/services, coverage area, request/rating consents, and rules agreement.
4. Server validates uniqueness and hashes the password; provider profile is created with the account.
5. User enters their role-appropriate application surface.

Legacy evidence: `createAccount()`, `createSocialAccount()`, `POST /api/register`, `/api/auth/social`, `/api/login`; registration markup/handlers in `index.html` and `app.js`.

Rebuild changes: real session tokens, login throttling, verified recovery, policy-version consent records, normalized taxonomy/location, and optional mode switching. Do not preserve legacy `x-kaila-user-id` identity.

## 2. Client posts a job

1. Client selects service category.
2. Client describes the work and may attach job photos/video.
3. Client selects urgency; scheduled work requires date/time.
4. Client supplies budget, contact preference, exact-location notes, and pins the job location.
5. Client confirms permission to forward the request and consent to post-job ratings.
6. Server creates state `Posted` and matches active providers by category and city/municipality.
7. Matching providers receive realtime/push notification.

Legacy evidence: `POST /api/requests` (`server.js:4938-5014`), `providerUserIdsForRequest()`, `providerMatchesRequestRow()`, `request_attachments`, FCM payload type `request`.

Target acceptance: post within 60 seconds; exact coordinates must be hidden from unassigned providers; asynchronous loading/success/error states; idempotent submission.

## 3. Provider discovers and responds

1. Provider sees open jobs matching active profile categories and city/municipality, excluding passed jobs.
2. Provider may pass, which hides the opportunity and removes their existing offer.
3. To offer, provider supplies amount, schedule, notes, and current location when the job is pinned.
4. Server stores the provider’s offer and changes the job to `Offers Received` or legacy `Countered`.
5. Client receives realtime and push notification.

Legacy evidence: request visibility in `getState()`, `POST /api/requests/:id/pass`, `/offers`, `offers` and `request_passes` tables.

Conflict: each new provider offer deletes the prior offer; “counter” is provider-authored and has no chain. The rebuild should preserve history. Owner must decide whether clients can counter.

## 4. Client compares offers and hires

1. Client views offers with provider identity, rating, completed jobs, amount, schedule/ETA, and notes.
2. Client selects one offer.
3. Server atomically records accepted provider and changes legacy state to `Accepted` (target `Provider Selected`).
4. Non-selected providers lose active access to offer detail; job request alerts are cleared.
5. Assigned provider receives acceptance notification; job chat opens.

Legacy evidence: `mapOffer()`, `buildReputations()`, `POST /api/requests/:id/confirm`, `canReadConversation()`, offer filtering in `getState()`.

Target acceptance: selection is authorized, idempotent, race-safe, and preserves the chosen offer revision as an immutable commercial snapshot.

## 5. Messaging and calling

1. After hire, client/provider open the job conversation. Disputed jobs may be accessed by customer service with an audit reason.
2. Participants exchange encrypted text and media; typing and presence are ephemeral realtime state.
3. Participants may react to job messages.
4. Audio/video calls use WebRTC signaling; missed/completed calls are recorded as message items and notifications.
5. Blocking prevents disallowed direct interaction.

Legacy evidence: `/api/requests/:id/messages`, `/typing`, `/presence`, reaction route, direct-conversation routes, `job_messages`, `direct_messages`, `kaila.call.signal`, `recordCallLogMessage()`, `conversation_access_audit`.

Rebuild requirements: authenticated conversation membership, paginated history, object-authorized media, encryption key rotation, durable delivery/read semantics, TURN for production reliability, and audited support access.

## 6. Provider travels to the job

1. Assigned provider starts travel from an active accepted job.
2. Server persists current navigation state and emits `kaila.navigation.start`.
3. Provider sends coordinates; server throttles, computes route distance/ETA, and derives on-the-way/nearby/arrived.
4. Client sees live marker, route, distance, ETA, and arrival changes.
5. Tracking stops on explicit stop or when the job leaves active travel-capable states.

Legacy evidence: socket handlers `kaila.navigation.start/location/stop`, `job_navigation_states`, `saveNavigationLocation()`, thresholds at `server.js:104-110`, map rendering in `app.js:12106-12283`.

Conflict: legacy travel is side-state while target PDD includes `Provider Traveling`. Owner must approve whether travel is a primary job stage or a concurrent sub-state. Consent, background tracking, and retention are unresolved.

## 7. Work, completion, revision, and auto-confirm

1. Assigned provider starts the accepted job: legacy `Accepted -> In Progress` (target `Working`).
2. Provider submits completion, optional note, and evidence: `Provider Marked Done`.
3. Client chooses:
   - confirm completion, producing legacy `Payment Released`;
   - request revision, producing `Revision Requested`; or
   - open a dispute.
4. If the client does nothing, the legacy scheduler auto-confirms after 48 hours and sets `Payment Released`.
5. A revised job returns to provider completion.

Legacy evidence: actions `start`, `provider_complete`, `client_complete`, `request_revision`; `autoConfirmExpiredJobs()`; completion-stage `request_attachments`.

Critical ambiguity: no payment processor/ledger exists. “Payment Released” is a label only. The rebuild must use `Completed` unless real payment requirements are approved and implemented. Auto-confirm duration and legal effect require approval.

## 8. Ratings and reviews

1. Once legacy state is `Payment Released`, client may rate provider and provider may rate client once, score 1-5 plus note.
2. Both ratings close the job as `Rated / Closed`.
3. If only one or neither rates, the seven-day default window closes the job automatically.
4. Provider reputation is calculated from request rating fields and completed jobs.

Legacy evidence: action `rate`, `closeExpiredRatingWindows()`, `buildReputations()`, bilateral fields on `requests`.

Target decisions: review visibility timing, moderation/appeal, edits, fraud controls, client reputation visibility, and whether mutual reviews are blind until both submit.

## 9. Cancellation

1. Client supplies an optional reason and requests cancellation.
2. Server permits cancellation before late/terminal states and sets `Cancelled`.
3. Navigation and job-request alerts stop as applicable.

Legacy evidence: action `cancel` (`server.js:5214-5219`). No provider cancellation, fees, no-show, rescheduling, or cancellation taxonomy is implemented. The status guard also checks `Rated` rather than active closed status `Rated / Closed`; do not copy it.

## 10. Dispute and support resolution

1. Client or assigned provider opens a dispute from Accepted, In Progress, Provider Marked Done, or Payment Released; note is mandatory and evidence may be attached.
2. Job becomes `Disputed`; normal conversation writes stop.
3. Customer service gains scoped job/conversation access, with access audit.
4. Support can resume work, request revision, release the legacy payment state, cancel, or close as `Resolved`, appending a resolution note.
5. Reports can separately be marked Open, In Review, or Closed by admin/customer service.

Legacy evidence: action `dispute` and `support_*`/`resolve_dispute`, `supportCanViewRequestConversation()`, `conversation_access_audit`, `/api/reports/:id/action`.

Rebuild changes: dedicated case aggregate, assignment, evidence timeline, decision reason, notifications, SLA, appeal/reopen policy, and immutable audit. Owner must approve staff authority, especially any financial outcome.

## 11. Account safety and deletion

1. User can report a user/job, block/unblock a non-staff user, and view own report status.
2. User types `DELETE` to request account removal.
3. Legacy server removes access/tokens/contact details, anonymizes user identity, and retains job/message/report/rating history.
4. Staff accounts require another administrator; admin can activate/deactivate/ban/delete subject to super-admin rules.

Legacy evidence: `/api/reports/user`, `/api/reports/job`, `/api/blocks`, `DELETE /api/account`, `/api/admin/users/:id/status`.

Rebuild requirements: published retention policy, export/access request process, legal holds, audit, credential revocation, media handling, and removal of hardcoded super-admin identity.

## 12. Public feed sharing (non-core)

1. Authorized user creates public/private feed post with media.
2. Public posts support reactions, nested comments, mentions, media interactions, and shares.
3. A public link opens `?route=public-post&post=<id>` without login; Facebook/Web Share are supported.

Legacy evidence: `/api/feed*`, `/api/public-post/:id`, `APP_ROUTES`, `loadPublicPost()`, `shareFeedPost()`, `feed_*` tables.

Recommendation: defer until the core hire-to-completion loop is stable. If retained, privacy/moderation and public media delivery must be rebuilt independently.
