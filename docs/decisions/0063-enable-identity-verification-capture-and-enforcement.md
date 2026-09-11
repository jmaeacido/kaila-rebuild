# 0063 — Enable identity verification capture and enforcement

## Status

Accepted for this staging deployment — 2026-09-11

## Context

Decision 0049 and 0054 keep `IDENTITY_VERIFICATION_CAPTURE_ENABLED` and `IDENTITY_VERIFICATION_ENFORCEMENT_ENABLED` off by default. Production collection remains blocked until every gate in `docs/privacy/identity-verification-compliance-pack.md` is approved and evidenced. That approval record is still incomplete.

Operators nonetheless asked to enable capture and enforcement on this host (`APP_ENV=staging`, public URL `https://kaila-app.com`).

On 2026-09-11 the DPO recorded **PIA Approved** and additional owner self-reviews were recorded under decision 0064. Production identity capture remains blocked by NPC, counsel, MFA, repository/backup, QA, and rehearsal gates listed in `docs/privacy/identity-verification-gate-status.md`.

## Decision

1. Set both runtime flags to `true` in `apps/api/.env` on this staging host.
2. Keep repository defaults and `.env.example` at `false`.
3. Treat this as an operational enablement for staging validation, not as completion of decision 0049's production launch gate.
4. Continue using the local `identity-evidence-local` disk until a dedicated production evidence repository and custody controls are configured.

## Consequences

- Users can consent and submit identity evidence; job posting, provider activation, and offer submission require an approved account verification.
- Real identity evidence may be collected on this host while the DPO launch checklist remains unfinished — residual compliance risk is accepted by the operator who requested enablement.
- Production / `APP_ENV=production` enablement still requires the completed compliance pack approval record before the same flags may be set there.
