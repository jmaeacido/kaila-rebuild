# Legacy Database Inventory

## Authority and caveats

The runtime schema is created and incrementally altered by `initializeDatabase()` in `C:\laragon\www\kaila-old\socket\server.js:799-1427`. `kaila_mvp.sql` is a snapshot and is not authoritative (`C:\laragon\www\kaila-old\AGENTS.md`). The audit did not connect to or modify a live database, so row counts, data quality, and production-only drift are unknown.

All primary IDs are application-generated string IDs (`createId()`, `socket/server.js:469`) stored mainly as `VARCHAR(64)`. Timestamps are `DATETIME` generated in Asia/Manila (`nowMysql()`, server top-level timezone). No migration version table exists.

## Core identity and marketplace tables

### `users`

Purpose: identity, authentication, role, contact/profile, consent, and lifecycle.

Important columns: `id`, unique `username`, nullable unique `email`, `password_hash`, role enum (`client`, `provider`, `admin`, `ops`, `customer_service`), `area`, category text, contact fields, social-auth fields, profile-file fields added by `ensureColumn`, consent, `account_status`, ban/delete timestamps, `created_at` (`socket/server.js:814-860`).

Risks/changes for rebuild:

- Split authentication credentials/identities, user profile, role assignments, consents, and account status.
- Replace role enum with explicit role/permission records or a carefully versioned enum.
- Store verification status as evidence-backed records; legacy `trust_level` is not identity verification.
- `auth_subject` uniqueness spans providers because it contains a provider-qualified subject (`authSubject()`).

### `providers`

Purpose: optional provider profile attached one-to-one to a user.

Relationship: `providers.user_id -> users.id ON DELETE CASCADE`; unique `user_id` (`server.js:862-915`).

Important fields: duplicated name/category/area, availability, skills, display name, type, services, experience, coverage, emergency availability, schedule, travel limits, fee/range, work samples/certificate proof, several consents, `trust_level`, and status.

Risks/changes: many multi-valued or domain fields are unvalidated `TEXT`; category and area matching relies on string normalization (`normalizeCategories()`, `providerMatchesRequestRow()`). Normalize services/categories, service areas, availability, portfolio assets, credentials, and verification reviews. Decide whether a user may act as both client and provider.

### `requests`

Purpose: job aggregate and its mutable lifecycle.

Relationship: `client_id -> users.id ON DELETE CASCADE`. `accepted_provider_id` is added later but has no foreign key (`server.js:917-980`).

Key field groups:

- Brief: category, urgency, area, budget, preferred schedule, contact method, exact notes, details.
- Location: `job_lat`, `job_lng`, source.
- Consent: forwarding and rating.
- Lifecycle: free-form `status`, created/updated/confirmed/provider-done/auto-confirm/payment/rating timestamps.
- Completion/revision/dispute: proof, revision, dispute notes.
- Ratings: obsolete-looking `rating_score/rating_note` plus bilateral client/provider score/note/time.

Risks/changes: one table carries job brief, state machine, financial wording, evidence notes, and reviews. Add a constrained current state plus append-only job status history; use decimal money and currency instead of `budget VARCHAR(80)`; add foreign key for assigned provider; model cancellation/dispute/completion separately; do not treat a status as payment proof.

### `offers`

Purpose: provider proposal for a request.

Relationships: request and provider user both cascade (`server.js:982-1001`). Fields include type (`offer`/`counter`), provider name snapshot, amount and schedule strings, notes, optional provider coordinates, created time.

Current route deletes a provider’s previous offer before inserting a replacement (`POST /api/requests/:id/offers`, `server.js:5083`). There is no revision chain, acceptance timestamp, withdrawn/expired status, currency, or client counter record. Rebuild as immutable offer revisions/negotiation messages with explicit actor and state.

### `request_passes`

Composite key `(request_id, provider_id)`, both cascading (`server.js:1065-1072`). Records provider dismissal of an opportunity. The offer is separately deleted when passed.

### `request_attachments`

Request-scoped media with stage enum `request`, `completion`, or `dispute`; stores local filename, original name, MIME, size, time (`server.js:1050-1063`). Rebuild should use an asset/object table, storage key, checksum, scan state, owner, visibility, retention, and signed delivery.

## Messaging, calls, and read state

| Table | Purpose and relationships | Evidence |
| --- | --- | --- |
| `job_messages` | Encrypted text/call-log message; belongs to request and sender | `server.js:1113-1127`, `encryptMessage()` |
| `job_message_attachments` | Local files belonging to job message | `server.js:1129-1138` |
| `job_message_reactions` | Composite `(message,user,reaction)` | `server.js:1174-1183` |
| `direct_messages` | Encrypted sender-recipient message/call log; later adds nullable `request_id` without FK | `server.js:1142-1158` |
| `direct_message_attachments` | Local files belonging to direct message | `server.js:1160-1169` |
| `missed_calls` | Caller/recipient, optional job/direct context, type/title/time | `server.js:1332-1345` |
| `message_read_states` | One read watermark per user, scope (`job`/`direct`), thread | `server.js:1372-1381` |
| `conversation_access_audit` | Staff access log by viewer/scope/thread/reason | `server.js:1394-1406` |

Rebuild notes: define a conversation/membership model instead of parallel job/direct implementations; retain append-only support-access auditing; introduce encryption key versioning/rotation; decide metadata encryption and retention; add FKs for request context; use per-message delivery/read state only if product requirements need it.

## Realtime, location, and notifications

### `job_navigation_states`

One current row per request; FK to request and provider. Stores status and arrival-state enums, provider coordinates/accuracy/heading/speed, computed distance/ETA, and lifecycle timestamps (`server.js:1348-1369`). It is current-state storage, not a location history. Privacy/retention, consent, background tracking, and history requirements need owner/legal approval.

### `push_tokens`

User-scoped FCM token with unique hash, platform/device and timestamps (`server.js:1003-1018`). The raw token is retained. Rebuild should encrypt/protect raw tokens, record last-seen/failure/revocation, support multiple platforms, and delete invalid tokens.

### `notification_read_states`

One read watermark by user/type; types are free-form (`server.js:1384-1391`). This is not a durable notification inbox for most marketplace events. Create a first-class notification table with recipient, event, payload reference, delivery channels/status, read time, deduplication key, and expiry.

### `activities`

Global title/detail/time log with no actor/recipient/FKs (`server.js:1088-1097`). It is used for admin activity and realtime notifications. Replace with domain events and/or typed audit entries; do not use it as user notification storage.

## Safety, moderation, and administration

| Table | Purpose | Important constraints/gaps |
| --- | --- | --- |
| `user_blocks` | Directional user block | Composite key; both users cascade; reason text (`server.js:1019-1028`) |
| `moderation_reports` | User/job reports with Open/In Review/Closed status | Reporter cascades; target user/request become null; no assignee, decision, or resolution record (`server.js:1031-1047`) |
| `audit_logs` | Admin/account action record with actor, target, metadata, IP, UA | No FK by design; metadata text; created indexes (`server.js:1409-1427`) |
| `validation_entries` | Ops/admin client surveys and provider interviews | Operator stored as ID/name but no FK; JSON responses (`server.js:1098-1110`) |

Disputes are not their own table: a request status plus `dispute_note` carries the case, while support appends outcome text to that field (`supportDisputeNote()`, request action route). Rebuild needs dispute cases, evidence, timeline, assignment, decisions, audit, and appeal policy.

## Social feed tables

The legacy community feed is a substantial independent aggregate:

- `feed_posts` and `feed_post_media`
- post-level `feed_post_reactions`, `feed_post_comments`, `feed_comment_reactions`
- media-level `feed_media_reactions`, `feed_media_comments`, `feed_media_comment_reactions`
- `feed_notifications`

Definitions are in `server.js:1185-1329`; routes span `/api/feed*` (`server.js:4125-4557`). Post/media comments duplicate nearly identical reaction, reply, hide, and delete structures. If retained, merge them into a polymorphic interaction model or keep separate aggregates behind common application services. The feature should not block the core marketplace phase.

## Relationship summary

```text
users
|- 0..1 providers
|- * requests (as client)
|  |- * offers -> users (provider)
|  |- * request_passes -> users (provider)
|  |- * request_attachments
|  |- * job_messages -> users (sender)
|  |  |- * job_message_attachments
|  |  `- * job_message_reactions -> users
|  `- 0..1 job_navigation_states -> users (provider)
|- * direct_messages (sender/recipient)
|- * push_tokens
|- * user_blocks (both sides)
|- * moderation_reports (reporter/optional target)
`- * feed_posts -> feed media/comments/reactions/notifications
```

Notable missing constraints: `requests.accepted_provider_id`, `direct_messages.request_id`, validation operator, audit actor/target, and several moderation actor columns do not have declared foreign keys.

## Migration recommendations

1. Freeze and export a production schema/data profile separately; do not infer production contents from `kaila_mvp.sql`.
2. Establish Laravel versioned migrations and a schema baseline. Never execute ad hoc DDL during normal API boot.
3. Define canonical IDs, UTC timestamps, money/currency, service taxonomy, geographic hierarchy, and state enums before import.
4. Build identity/auth and authorization first; map legacy users only after credentials/session design and consent/legal review.
5. Migrate core users/providers/jobs/offers into normalized tables, preserving legacy IDs in dedicated mapping fields.
6. Convert job status into current state plus immutable transition history. Flag invalid/unknown strings rather than coercing silently.
7. Import media only after object storage, malware scanning, ownership, and signed-access rules exist.
8. Treat encrypted messages as a separate high-risk migration: verify the key, create key-version metadata, test decrypt/re-encrypt on a sample, and retain audit evidence.
9. Defer feed/AI/validation data unless those features are explicitly approved for the first rebuild release.
10. Reconcile counts, FK exceptions, status distributions, duplicate usernames/emails, orphan files, unreadable ciphertext, and checksums in dry-run reports before cutover.

## Unknowns requiring live-data verification

- Production table/column drift and row counts.
- Whether the checked-in SQL snapshot matches any deployed environment.
- Actual status values and invalid transitions present in data.
- Orphaned uploads, duplicate files, and media malware/content risk.
- Availability and custody of `KAILA_MESSAGE_ENCRYPTION_KEY` and Firebase credentials.
- Whether users consented to the retention/migration uses required by the rebuild.
