# Identity verification — reviewer runbook

| Field | Value |
| --- | --- |
| Owner | Operations / trust & safety — John Mark Agustin Estrosos Acido |
| Updated | 2026-09-11 |
| Systems | Admin → Identity verifications; API under `/api/v1/admin/marketplace/identity-verifications` |

## One-person constraint

KAILA currently has a single trained reviewer (the owner). The compliance pack requires appeals to be decided by a **different** reviewer than the original decision. Until a second trained reviewer exists, **appeals must be paused or escalated externally**; do not rubber-stamp your own appeal as independent.

## Onboarding / offboarding

1. Only staff with admin marketplace access may review.
2. Use a unique account; no shared passwords.
3. MFA is **required by policy** and **not yet implemented in software** — prefer a dedicated admin device and short sessions until MFA ships.
4. Offboarding: disable `is_admin` / staff role immediately.

## Decision flow

1. Open pending queue; claim the case.
2. Enter a purpose-bound reason before preview.
3. Confirm scan status is clean; never open malware-rejected files.
4. Compare ID portrait to selfie; check expiry and accepted ID type; confirm age ≥ 18.
5. Decide: approve / needs_resubmission / reject / escalate using bounded reason codes only.
6. Never paste full ID numbers, addresses, or birth dates into free-text notes.

## Escalation

Escalate suspected forgery, underage uncertainty, or conflict-of-interest cases. Pause marketplace-critical actions if needed.
