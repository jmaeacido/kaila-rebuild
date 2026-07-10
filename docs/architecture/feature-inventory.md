# Legacy Feature Inventory

## Classification rules

- **Preserve**: core verified behavior aligned with the product vision.
- **Improve**: retain the user outcome but replace unsafe, incomplete, or brittle implementation.
- **Merge**: consolidate duplicate concepts/workflows.
- **Remove**: do not carry into the rebuild.
- **Defer**: valid but not required for the first core marketplace implementation.
- **Needs clarification**: owner/product/legal decision blocks classification or contract.

The classification applies to product behavior, not legacy code reuse. No legacy UI or architecture should be copied.

| Feature | Classification | Evidence | Rebuild disposition |
| --- | --- | --- | --- |
| Client/provider registration and login | Improve | `/api/register`, `/api/login`, `createAccount()` | Preserve outcome; add real sessions, recovery, throttling, consent versions |
| Google/Facebook sign-in | Defer | `/api/auth/social*`, verification functions | Add after core auth; confirm providers and account-link policy |
| Dual client/provider capability | Needs clarification | admin-added provider profile; `canUseMarketplaceRole()` | Decide switchable modes vs exclusive roles |
| Provider profile, services, coverage, availability | Improve | `providers`, `saveProviderProfileForUser()` | Normalize taxonomy/service areas, portfolio, credentials |
| Trust level and verification display | Needs clarification | `providers.trust_level`, no evidence workflow | Define verified claims and review process before display |
| Post/edit a pinned job | Preserve | `/api/requests`, `/api/requests/:id` | Core; structured brief, private location, asset uploads |
| Provider category/city matching | Improve | `providerMatchesRequestRow()` | Replace string matching with taxonomy and service-area model |
| Opportunity pass/dismiss | Preserve | `request_passes`, `/pass` | Keep per-provider dismissal |
| Provider offer | Preserve | `offers`, `/offers` | Immutable amounts/currency/schedule and authorization |
| Counteroffer type | Needs clarification | `offers.type`, prior offer deleted | Decide two-sided negotiation and expiry |
| Offer comparison and provider selection | Preserve | `/confirm`, `mapOffer()` | Atomic selection and accepted commercial snapshot |
| Seven-stage visual job lifecycle | Preserve | PDD; legacy `/action` | Implement canonical state machine, not legacy labels |
| Revision loop | Improve | `request_revision`, `Revision Requested` | Model transitions/history and evidence clearly |
| Client cancellation | Improve | action `cancel` | Add reasons, provider/no-show/reschedule/fee policy |
| Provider cancellation/no-show | Needs clarification | no verified route | Define operational policy |
| Provider completion evidence | Preserve | `request_attachments.stage=completion`, `provider_complete` | Private object storage, scan, audit |
| 48-hour auto-confirm | Needs clarification | `autoConfirmExpiredJobs()` | Confirm timing, legal meaning, reminders, exceptions |
| “Payment Released” state | Remove | request status/timestamps; no gateway/ledger | Remove wording unless payment system is approved |
| Integrated payments/escrow | Needs clarification | not implemented | Product, legal, provider, fees/refunds decision |
| Bilateral ratings | Preserve | client/provider rating fields, action `rate` | Dedicated reviews, visibility/moderation/fraud rules |
| Seven-day rating window | Needs clarification | `closeExpiredRatingWindows()` | Confirm window and blind/mutual publication rules |
| Disputes | Improve | `Disputed`, support actions, note field | Dedicated case/evidence/decision/audit workflow |
| User/job reporting | Preserve | `moderation_reports`, report routes | Generalize target types and case management |
| User blocking | Preserve | `user_blocks`, block routes | Enforce consistently across discovery/chat/calls |
| Account anonymized deletion | Improve | `DELETE /api/account` | Formal retention/legal-hold/export process |
| Job chat | Preserve | `job_messages`, message routes | Conversation aggregate, auth, pagination, key rotation |
| Direct messaging | Defer | `direct_messages`, direct routes | Add after hired-job chat; define initiation rules |
| Message attachments | Preserve | attachment tables/routes | Object storage and authorized signed access |
| Message reactions | Defer | `job_message_reactions` | Noncritical polish |
| Typing/presence | Improve | presence routes/maps/events | Ephemeral TTL, authenticated rooms, multi-node adapter |
| Audio/video calls | Defer | WebRTC, `kaila.call.signal` | Add after chat; TURN, abuse/privacy/background tests |
| Missed/completed call logs | Merge | `missed_calls` plus call-kind messages | Model calls once, render into conversation/notifications |
| Live provider travel tracking | Preserve | `job_navigation_states`, navigation events | Core PDD feature; privacy and lifecycle improvements |
| OSRM route/ETA | Improve | `lookupRouteDistanceKm()`, app route calls | Provider abstraction, caching, quotas, failure states |
| Background location | Needs clarification | Android location permissions but no verified background service | Decide consent, policy, technical scope |
| Realtime marketplace updates | Preserve | Socket.IO domain events | Authenticated minimal events plus REST reconciliation/outbox |
| FCM push notifications | Preserve | push token/send functions, Android receiver | Durable notification model, preferences, delivery logs |
| Persistent job-request alert | Needs clarification | FCM `persistent`, Android job channel | Confirm UX, opt-out, expiry, Play policy |
| Incoming full-screen call notification | Defer | `KailaNativePlugin.showIncomingCall()` | Reassess Android eligibility and abuse controls |
| PWA/offline app shell | Improve | `sw.js`, manifest | Define safe caching/offline recovery; never cache private data loosely |
| Capacitor Android packaging | Preserve | root package scripts, `android/` | Recreate after web/API foundation; extract custom native requirements |
| APK self-update/download | Remove | `/api/mobile-update*`, `mobile-update.json` | Prefer managed store/release channel unless enterprise distribution approved |
| Social/community feed | Defer | `/api/feed*`, `feed_*` tables | Large non-core subsystem; revisit after marketplace validation |
| Public shared feed posts | Defer | `/api/public-post/:id`, app public-post route | Requires public-media/moderation/privacy design |
| Feed post/media duplicate interactions | Merge | parallel post/media comments/reactions tables | Common interaction services/model if feed retained |
| Katabang AI assistant | Defer | `/api/assistant/chat` | Add only with approved data/prompt/safety policy |
| AI validation decision signals | Defer | `/api/validation/decision-signal` | Operations tooling, not core consumer rebuild |
| AI admin analytics | Defer | `/api/analytics/insights` | Start with verified metrics; AI later |
| Ops surveys/provider interviews | Defer | `validation_entries`, `/api/validation*` | Separate internal module if still operationally needed |
| Customer-service role | Preserve | report/dispute/support conversation logic | Separate admin/support UI and granular permissions |
| Ops role | Needs clarification | validation-only state branch | Confirm continued organizational role |
| Admin account management | Improve | `/api/admin/users*` | Separate admin app, granular permissions, MFA/audit |
| Hardcoded super-admin username | Remove | `SUPER_ADMIN_USERNAME`, `ensureSuperAdminAccount()` | Provision roles securely; no identity-by-username |
| Admin database truncate | Remove | `/api/admin/truncate` | Never expose destructive production wipe endpoint |
| Global activity stream | Merge | `activities`, `kaila.activity` | Separate domain event, admin audit, and user notification concepts |
| Conversation access auditing | Preserve | `conversation_access_audit` | Retain append-only reasoned staff access logs |
| Admin audit logs | Preserve | `audit_logs`, `recordAuditLog()` | Expand coverage, immutability, retention/export |
| Local base64 file upload | Remove | `decodeAttachment()`, JSON 35 MB, local dirs | Direct private object upload with scan and signed delivery |
| Startup schema creation/mutation | Remove | `initializeDatabase()`, `ensureColumn()` | Laravel versioned migrations and deployment controls |
| Monolithic `/api/state` | Remove | `/api/state`, `getState()` | Resource-specific, paginated, authorized endpoints |
| Raw user-ID HTTP/socket auth | Remove | `requireUser()`, socket `identify` | Standards-based authenticated sessions/tokens |
| Unrestricted CORS/global socket room | Remove | `cors()`, Socket.IO `origin:*`, `subscribe` | Allowlist and server-controlled rooms |
| Unauthenticated media routes | Remove | `/media*` routes | Object authorization and expiring signed access |
| Bootstrap/Font Awesome consumer UI | Remove | `index.html`, `style.css` | Use KAILA system and Lucide; no legacy visual copying |
| Founder/business package | Defer | `KAILA_Founder_Grade_Package/` | Documentation only; not runtime migration |

## Recommended launch boundary

Launch foundation should include secure identity, profiles/modes, service taxonomy/areas, jobs, opportunities, offers/selection, hired-job chat, live travel, work/completion, reviews, basic safety/reporting, durable notifications, and separate minimal support tooling. Defer feed, AI, calls, validation suite, analytics enhancements, and public sharing. Payments and ambiguous policy items remain blocked on owner approval.
