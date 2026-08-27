# 0049 — Identity verification requires a DPO-controlled compliance gate

## Status

Proposed and implementation-blocking — 2026-08-27

## Context

KAILA intends to require a government-issued ID and fresh selfie before a client submits a first job and before any provider profile is activated. These records create materially greater privacy, identity-theft, insider-access, fairness, retention, and regulatory risk than the existing general provider-credential uploads.

The current provider credential model cannot establish identity. It treats any approved credential as a public `verified` signal, does not require a matching selfie or specific identity consent, and does not implement the short identity-evidence retention schedule. Reusing it would conflict with the Product Design Document rule that identity verification may be shown only when genuinely verified.

## Decision

- Identity verification is a separate account-level domain, not a provider credential.
- One valid verification applies to both client and provider modes; role changes do not cause duplicate collection.
- Registration and browsing remain available without verification. The server blocks first-job submission and provider activation until identity status is approved.
- The initial release uses trained human review and does not use facial-recognition automation or retain biometric templates.
- Raw evidence uses a dedicated private purpose, repository, authorization policy, access audit, and automatic deletion lifecycle.
- Public and marketplace APIs expose only the minimum status required for gates and an accurately worded `Identity verified` badge.
- The feature flag defaults off. Engineering may not enable capture in production until every gate in `docs/privacy/identity-verification-compliance-pack.md` is approved and evidenced.
- A processor, facial matching, OCR that sends data externally, duplicate-face searching, new purpose, new country, or longer retention requires an updated PIA and decision before use.

## Consequences

- Existing provider credential approval must no longer be interpreted as identity verification when this feature is implemented.
- Versioned specific consent, resubmission, independent appeal, withdrawal, rights handling, retention, legal holds, and deletion verification are first-class requirements rather than follow-up tasks.
- Product copy cannot claim that verification makes a person safe, trustworthy, background-checked, or fraud-free.
- Production release remains blocked even if the UI and API are technically complete when an organizational, vendor, registration, security, or DPO approval is missing.

## Required records

- `docs/privacy/identity-verification-compliance-pack.md`
- `docs/privacy/identity-verification-notice-and-consent.md`
- approved PIA and residual-risk record;
- NPC registration/update or documented exemption evidence;
- processor assessment and agreement, if applicable;
- reviewer/access/rights/incident/retention runbooks and rehearsal evidence; and
- security, deletion, accessibility, and platform validation results.

