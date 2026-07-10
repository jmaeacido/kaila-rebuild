# KAILA Development Instructions

## Project Objective

Rebuild KAILA as a modern, consumer-grade, mobile-first local services marketplace for clients and independent service providers.

The application must feel like a polished consumer product, not an administrative dashboard, ERP, government system, or generic Bootstrap application.

## Mandatory Source Documents

Before planning or modifying code, read these files completely:

1. `KAILA_PRODUCT_DESIGN_DOCUMENT.md`
2. `KAILA_DESIGN_SYSTEM.md`

These documents are authoritative.

If code, mockups, legacy behavior, or assumptions conflict with these documents, stop and document the conflict before proceeding.

## Architecture

Use this target architecture unless an approved architecture decision states otherwise:

- Next.js with TypeScript for the client/provider frontend
- Laravel for the REST API and backend business logic
- MySQL for persistent storage
- Socket.IO for realtime in-app communication
- Firebase Cloud Messaging for background and closed-app notifications
- Capacitor for Android packaging
- AdminLTE must not be used in the client/provider application
- Administrative tooling must remain visually and structurally separate

## Development Principles

- Mobile-first, but never compromise desktop and browser usability
- One screen should have one primary purpose
- Every screen should have one obvious primary action
- Use reusable components rather than page-specific duplication
- Use semantic design tokens; never hardcode visual values unnecessarily
- Preserve business logic on the server
- Never trust client-provided authorization or pricing decisions
- Every asynchronous operation requires loading, success, empty, and error states
- Realtime events must reconcile with server state
- Accessibility and touch usability are mandatory
- Optimize for entry-level and mid-range Android devices
- Do not introduce a dependency without explaining its purpose

## UI Rules

- Use the KAILA design tokens
- Use Lucide icons consistently
- Do not mix icon libraries
- Do not use AdminLTE, dashboard templates, or generic Bootstrap styling
- Avoid dense tables in the consumer-facing application
- Prefer cards, lists, timelines, sheets, and focused forms
- Minimum interactive target size: 44 × 44 pixels
- Do not use decorative animation that delays user actions
- Use vector illustrations for promotional and empty-state artwork
- Real images are reserved for user profiles, portfolios, job evidence, and user-generated content

## Code Quality

- TypeScript strict mode must remain enabled
- Avoid `any`; document unavoidable exceptions
- Validate inputs on both client and server
- Use feature-based organization
- Keep components small and composable
- Separate presentation, state, API access, and domain logic
- Add automated tests for critical business rules
- Run formatting, linting, type checking, tests, and production builds before reporting completion

## Work Discipline

Before implementation:

1. Inspect the repository.
2. Read both design documents.
3. Summarize relevant requirements.
4. Identify assumptions, risks, and unresolved conflicts.
5. Present a scoped implementation plan.

During implementation:

1. Work only within the approved scope.
2. Do not silently rewrite unrelated modules.
3. Preserve working behavior unless the task explicitly changes it.
4. Record significant architecture decisions in `docs/decisions/`.
5. Keep progress verifiable through small coherent commits.

After implementation:

1. Summarize files changed.
2. Explain important decisions.
3. Report validation commands and results.
4. Disclose remaining risks, limitations, and unfinished work.
5. Do not claim completion if validation failed.

## Legacy Application

The existing PHP application is a source of business rules and behavior, not a visual or architectural template.

When inspecting the legacy application:

- Extract workflows, permissions, database relationships, API behavior, and realtime events
- Do not reproduce AdminLTE layouts
- Do not copy insecure or obsolete patterns
- Do not change the legacy application unless explicitly instructed
- Document unclear or contradictory behavior before migration
