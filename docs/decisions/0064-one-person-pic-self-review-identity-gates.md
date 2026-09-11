# 0064 — One-person PIC model and self-review identity launch gates

## Status

Accepted — 2026-09-11

## Context

KAILA is not yet formally registered as a business and is operated by a single person, John Mark Agustin Estrosos Acido, who simultaneously holds PIC/operator, DPO/privacy, security, operations, product, marketing, and release roles. Decision 0049 requires a completed compliance pack before production identity capture. Several pack gates assume separate counsel, independent security review, and corporate registration that do not yet exist.

## Decision

1. Identify the PIC in draft/privacy documents as **John Mark Agustin Estrosos Acido, an individual operating the KAILA platform**. Do not describe KAILA as a corporation or registered company until formal registration exists.
2. Record multi-role owner sign-offs as **separate self-reviews** by the same individual. One role’s approval does not imply independent assurance for another role.
3. Record counsel as **Pending — no legal counsel currently retained.**
4. Record NPC registration/exemption as **Pending determination and filing. KAILA processes identity documents and precise location; no exemption is presently claimed.**
5. Treat processor due diligence as **N/A** while verification remains first-party.
6. Keep production identity capture blocked while MFA, dedicated evidence repository/backup-restore evidence, NPC/counsel, QA, and related blockers remain open — even when documentation and self-reviews are complete.
7. Maintain live gate classification in `docs/privacy/identity-verification-gate-status.md`.

## Consequences

- Privacy Policy and identity notice can truthfully name an individual PIC and DPO contact without inventing a company.
- Staging may continue to exercise capture/enforcement under decision 0063 with residual compliance risk disclosed.
- Independent counsel, NPC filing, business registration, and admin MFA remain real external/engineering work, not documentation exercises.
