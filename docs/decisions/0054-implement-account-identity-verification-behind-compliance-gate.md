# 0054 — Implement account identity verification behind the compliance gate

## Status

Accepted for non-production validation — 2026-09-09

## Context

Decision 0049 requires government-ID and selfie verification to be independent from provider credentials and prohibits production collection until the DPO-controlled launch record is complete. The existing application incorrectly treated an approved provider credential as an identity badge.

## Decision

- Add one account-level identity-verification record shared by client and provider modes.
- Record versioned, purpose-bound consent and issue a short-lived, single-use upload session.
- Store safely decoded, metadata-stripped evidence on a dedicated private disk, quarantined until malware scanning succeeds.
- Permit only audited, reason-bound, watermarked reviewer previews; retain no public or user download endpoint.
- Use bounded human-review outcomes and reason codes. Appeals require a reviewer different from the original reviewer.
- Withdrawn consent queues evidence for purge and immediately removes verified status.
- Run an hourly evidence purge and retain content-free decision, consent, access, and deletion records according to the compliance pack.
- Derive every public `Identity verified` signal solely from a current approved account verification, never from provider credentials.
- Enforce verification before job posting, provider activation, and offer submission only when enforcement is explicitly enabled.
- Keep capture and enforcement flags off by default. Production enablement remains prohibited until decision 0049's approval record is complete.

## Consequences

The implementation can be exercised using synthetic evidence in controlled test environments without authorizing real identity collection. Operations must configure a dedicated production evidence repository, encryption/key custody, backup expiry, alerting, reviewer controls, and all outstanding governance evidence before either flag is enabled.
