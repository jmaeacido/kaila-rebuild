# ADR-0001 — Unified account with switchable Client and Provider modes

**Decision date:** 2026-07-10  
**Applies to:** New KAILA platform and later migration work

**Status:** Accepted

## Context

A person may hire providers and also offer services. Separate accounts would duplicate identity, contact, session, notification, and reputation data and would create unnecessary friction.

## Decision

KAILA will use one account per person. The same account can operate in Client mode and Provider mode.

`active_mode` is a presentation preference and navigation context only. It must never be treated as an authorization role or trusted as proof that the user may perform provider actions.

Provider-specific actions require a provider profile and any eligibility/status checks defined by policy. A user without a completed provider profile may switch to Provider mode but must be directed to provider onboarding and must not receive provider capabilities prematurely.

## Consequences

- One authentication identity, session set, notification inbox, and account security model.
- Client and provider profiles remain logically separable but share the same user identity.
- Authorization policies must check resource participation and provider status, not merely `active_mode`.
- Reputation may be displayed separately by role while remaining tied to one account.


