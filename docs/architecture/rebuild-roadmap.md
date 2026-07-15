# Rebuild Roadmap

## Scope and sequencing principles

This roadmap implements the required Next.js/TypeScript frontend, Laravel REST API, MySQL, separate Socket.IO, FCM, and Capacitor architecture. It does not authorize installation or code generation in this discovery pass. Each phase ends in evidence-based acceptance before the next dependency begins.

Cross-cutting requirements from `AGENTS.md`, the PDD, and design system: strict TypeScript, server-owned authorization/pricing/state transitions, KAILA tokens and Lucide, accessible 44 px targets, mobile-first through desktop, loading/empty/error/success states, tests for critical rules, realtime reconciliation, and separate consumer/admin surfaces.

## Phase 0: owner decisions and architecture records

Dependencies: completed legacy audit (these documents).

Work:

- Approve account mode model, canonical job state machine, offer negotiation, cancellation/revision/dispute policy, auto-confirm, ratings publication, exact-location policy, notification behavior, and launch feature boundary.
- Decide whether payments are out of scope; if not, commission a separate regulated payment architecture.
- Select session/auth approach, object storage/scanning, queue, Socket.IO adapter, TURN, maps/routing provider, FCM credential ownership, monitoring, and deployment environments.
- Record decisions in `docs/architecture/adr/` and maintain the Phase 0 decision register before implementation.

Acceptance: every item in “Owner approval required” below has an owner and written decision; terminology and state diagram are frozen for Phase 1-4.

Risks: coding before policy freeze will reproduce contradictory legacy states. Validation: architecture/security/product review against all seven audit documents.

## Phase 1: repository and secure platform foundation

Dependencies: Phase 0 architecture choices.

Work:

- Scaffold Next.js strict TypeScript consumer frontend, Laravel API, Socket.IO service, shared API/event schemas, and separate admin boundary.
- Establish environments, secrets, CI, formatting/lint/typecheck/tests/builds, dependency policy, logging, tracing, error reporting, queue/outbox, and database migrations.
- Implement auth/session lifecycle, rate limiting, CORS/CSRF as applicable, authorization policies, audit foundation, policy/consent versions, and test fixtures.
- Establish semantic design tokens and foundational accessible components without redesigning feature screens prematurely.

Acceptance:

- Register/login/logout/refresh/revoke work; forged IDs and cross-user access fail automated tests.
- Strict typecheck, PHP static analysis/style, unit/feature tests, and production builds pass in CI.
- Socket handshake uses signed identity and clients cannot choose rooms.
- No secret/default credential is committed; migrations apply/rollback in a disposable environment.

Risks: auth split across Laravel/Socket.IO; premature component divergence. Validation: threat model, dependency/security scan, authz matrix tests, accessibility smoke test, build/deploy rehearsal.

## Phase 2: marketplace reference data and profiles

Dependencies: secure identity, migrations, object-storage decision.

Work:

- Implement service taxonomy, geographic hierarchy/service areas, user profile, provider profile, availability, portfolio, credentials/review state, and approved account modes.
- Build admin management for taxonomy and verification in the separate admin surface.
- Define privacy-safe public provider representation.

Acceptance: providers can create/update a valid profile; clients can discover only eligible providers; unverified badges never appear; category/area matching is deterministic and tested; profile images/portfolio use private upload flow and scan state.

Risks: importing legacy free text; falsely implying verification; complex dual-mode navigation. Validation: schema constraints, matching rule tests, authorization tests, mobile/desktop/accessibility review, object access tests.

## Phase 3: job posting and provider opportunities

Dependencies: taxonomy, locations, profiles, assets, notifications base.

Work:

- Implement job draft/post/edit, pinned location with minimized opportunity view, schedule/budget, attachments, provider matching, opportunity list, and pass/dismiss.
- Add durable notifications with Socket.IO and FCM delivery for matching providers.
- Add immutable job timeline from creation.

Acceptance: a client posts within the PDD’s 60-second target; only matching providers see opportunities; exact address/coordinates are not exposed before approved stage; duplicate submissions are idempotent; alert delivery/retry/clear behavior is observable.

Risks: location leakage, notification storms, category gaps, upload abuse. Validation: authorization/property tests, load test matching/notifications, GPS denial/failure states, scan/size tests, reconnect reconciliation.

## Phase 4: offers, negotiation, and provider selection

Dependencies: active jobs/opportunities and approved negotiation policy.

Work:

- Implement immutable offers/revisions, comparison projection, withdraw/decline/counter if approved, selection transaction, non-selected participant cleanup, and accepted commercial snapshot.
- Notify client of offers and selected provider of hire.

Acceptance: providers cannot offer on own/out-of-area/closed jobs; concurrent selections yield exactly one assignment; offer history is never overwritten; client can compare trust/price/timing; unauthorized providers cannot see competing offers.

Risks: race conditions, string money, negotiation ambiguity. Validation: transition/concurrency/idempotency tests, permissions matrix, notification tests, responsive/accessibility review.

## Phase 5: hired-job communication and live travel

Dependencies: selected provider, secure realtime, TURN decision, location policy.

Work:

- Implement job conversation, attachments, read/typing state, audited support access, and blocking integration.
- Implement travel start/location/arrival/stop, map/ETA, stage reconciliation, privacy/retention, foreground/background behavior as approved.
- Calls remain optional/deferred; if approved, add after reliable chat/travel.

Acceptance: only participants/scoped staff access conversation/location; support access creates immutable audit; reconnect restores messages/current travel; location stops automatically outside allowed state; route failure degrades safely; multi-node realtime tests pass.

Risks: sensitive location/chat exposure, battery usage, Socket.IO divergence, NAT/call reliability. Validation: adversarial room tests, reconnect/ordering tests, Android device matrix, permission denial/background lifecycle, route provider failure, encryption rotation drill.

## Phase 6: work, completion, reviews, cancellation, and disputes

Dependencies: approved state/policy decisions and hired-job communication.

Work:

- Implement working/completion evidence/client confirmation/revision, timers/reminders if approved, cancellation rules, bilateral reviews, reputation projections, and dedicated disputes/case decisions.
- Build minimal separate customer-service case UI with assignment, evidence, access reason, decisions, and audit.
- Use “Completed” rather than payment language unless an actual payment subsystem exists.

Acceptance: every transition is server-authorized and recorded once in timeline; completion evidence is private; timer jobs are idempotent; ratings cannot be duplicated/manipulated through client payloads; dispute decisions are structured and audited; all terminal states stop travel and stale alerts.

Risks: policy/legal disputes, timer races, staff overreach, review retaliation. Validation: exhaustive state-machine tests, scheduled-job tests with controlled clock, audit review, support permission matrix, retention tests.

## Phase 7: migration rehearsal and pilot hardening

Dependencies: core feature parity through Phase 6.

Work:

- Profile production legacy schema/data read-only; map IDs/statuses/taxonomy; dry-run identity/profile/job/offer/review import.
- Separately rehearse media transfer and encrypted-message migration only if approved and key custody is verified.
- Add monitoring/SLOs, backups/restore, incident runbooks, abuse controls, performance budgets, offline recovery, and pilot support playbook.

Acceptance: repeatable migration produces reconciliation report with counts/exceptions/checksums; restore drill passes; no critical/high security findings; performance/accessibility targets pass on entry-level Android and target browsers; rollback/cutover plan is approved.

Risks: production drift, missing encryption key, invalid legacy states, consent/retention, downtime. Validation: multiple dry runs, sampled record comparison, orphan/media scan, penetration test, load/soak test, backup restore, stakeholder UAT.

## Phase 8: Capacitor Android packaging and release

Dependencies: stable responsive web app/API/realtime/FCM and pilot hardening.

Work:

- Create Capacitor packaging, push/deep links, permissions, app lifecycle, secure storage, network recovery, and release pipeline.
- Reimplement only approved custom native requirements from `KailaMessagingService.java` and `KailaNativePlugin.java`; do not copy generated Android project wholesale.
- Prefer managed store distribution over the legacy APK self-update endpoint.

Acceptance: signed builds pass Android compatibility/security checks; deep links and notification actions route correctly from foreground/background/terminated states; account switching refreshes tokens; denied permissions degrade safely; store policy checklist passes.

Risks: OEM behavior, background restrictions, full-screen intent policy, stale web bundle. Validation: physical-device matrix, Play pre-launch report, push lifecycle tests, upgrade/rollback tests, privacy data-safety review.

## Phase 9: deferred modules

Candidates: direct messaging, audio/video calls, social feed/public sharing, Katabang assistant, AI analytics, ops validation suite, richer admin analytics. Each requires a new scoped plan and approval; none should destabilize the core hire-to-completion flow.

## Owner approval required

1. Can one identity switch between client and provider modes?
2. Exact canonical state diagram and mapping from legacy statuses, including travel, revision, cancellation, dispute, and `Resolved`.
3. Is “payment” entirely out of scope? If not, what licensed provider and financial flow applies?
4. Who may counter offers, how history/expiry works, and what is binding?
5. Cancellation/no-show/reschedule policy for both parties.
6. Auto-confirm timing, reminders, exceptions, and legal effect.
7. Review window, blind publication, edits, moderation, and client-rating visibility.
8. Support authority and appeal/reopen policy for disputes.
9. Exact location/background tracking consent, visibility, and retention.
10. Direct messaging/calls before hire, notification intrusiveness, and launch scope for feed/AI/ops tooling.
11. Whether and how legacy accounts/messages/media are migrated, including encryption-key custody and consent.

## Recommended next implementation phase

Begin Phase 0 with a short owner decision workshop and architecture decision records, then proceed to Phase 1 secure platform foundation. Do not begin screen implementation or legacy data migration until the job state, role/mode, payment language, and location/privacy decisions are approved.
