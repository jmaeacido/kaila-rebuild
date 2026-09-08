# ADR 0056: Consumer-grade admin operations UI

## Context

KAILA’s product and design documents ban AdminLTE-style dashboards for the
marketplace, while AGENTS.md and ADR-0042 require administrative tooling to stay
a separate application and shell. The admin app already used design tokens and
Lucide, but still felt like a dense ops console: no shared `@kaila/ui`, browser
`prompt`/`confirm` flows, minified screens, and a flat navigation chrome.

Staff need consumer-grade clarity (one purpose, one primary action, full async
states, KAILA visual language) without merging admin into the marketplace app.

## Decision

1. Apply the KAILA design-system QA bar to `apps/admin`: tokens, Inter via
   `next/font`, Lucide, `@kaila/ui` primitives, loading/empty/error/success
   states, and 44px targets.
2. Keep a distinct Operations shell (brand + destinations + notifications +
   appearance). Do not reuse the consumer marketplace navigation or blur the
   separate admin Android/web origins.
3. Prefer admin-local layout kit pieces (page shell, reason dialog, list/detail
   workspace) for ops workflows; extend `@kaila/ui` only for truly shared
   primitives.
4. Replace browser prompts/confirms with accessible dialogs that still submit
   the same access and decision reason fields to existing APIs.

## Consequences

- Admin and web share visual language and component primitives without sharing
  product chrome.
- Ops screens can remain denser than consumer flows when staff work requires it,
  using progressive disclosure (detail panel / dialog) instead of packed tables.
- Validation includes admin production build, lint/typecheck/tests, and design
  review against the logo-off brand checklist.
