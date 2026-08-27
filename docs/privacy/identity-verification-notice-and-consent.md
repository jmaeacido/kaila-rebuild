# Identity-verification notice and consent copy

| Field | Value |
| --- | --- |
| Status | Draft — not approved for production |
| Owner | KAILA DPO and product content owner |
| Version identifier | `identity-verification-1.0` |
| Requires | Approved compliance pack, corporate PIC details, processor details, translations, and counsel review |

This copy is separate from the Terms and general Privacy Policy. The application must store the exact notice and consent version accepted by the user. Consent controls must be unticked by default and must not be bundled with marketing or unrelated processing.

## Gate shown to a client

### Verify your identity to post your first job

KAILA checks the identity of people who take part in jobs. This helps reduce impersonation and protects both clients and providers when they meet.

You can keep browsing without verification, but you cannot post a job until it is complete.

**Primary action:** Verify my identity

**Secondary action:** Not now

## Gate shown for provider activation

### Verify your identity to become a provider

Before your provider profile can go live, KAILA needs to check that you match a valid government-issued ID. This helps protect people who arrange in-person services.

You can continue using client features that do not require verification, but you cannot publish a provider profile, send offers, or accept work until verification is complete.

**Primary action:** Verify my identity

**Secondary action:** Not now

## Just-in-time notice before capture

### What KAILA will collect

- a photo of an accepted government-issued ID; and
- a new selfie taken during this verification.

### Why we need it

An authorized KAILA reviewer will compare the ID and selfie, check that the ID appears valid and unexpired, and confirm that the account holder is at least 18. We use this information only for identity verification, fraud and safety investigations, appeals, and related legal claims.

The initial verification process does not use automated facial recognition or create a facial template. KAILA does not sell this information or use it for advertising or AI training.

### Who can see it

Only assigned, trained KAILA verification or privacy/safety reviewers can view a protected, audited preview. Other users see only whether your identity is verified. They never see your ID, selfie, ID number, birth date, or address.

Before production release, replace this paragraph with the legal name and address of KAILA as Personal Information Controller, its DPO contact details, every identity-verification processor, processing country, and recipient category. If there is no processor, say that verification is performed by authorized KAILA personnel using KAILA-controlled systems.

### How long we keep it

Unsubmitted captures are deleted within 24 hours. After a final decision, raw ID and selfie images are normally deleted within 30 days after approval or, for a rejection, within 30 days after the appeal window closes. They may be kept longer only for an active appeal, documented fraud or safety investigation, legal claim, or legal hold. A minimized consent, decision, and audit record is kept while your account is open and normally for two years after it closes.

### Your choices and rights

Verification is optional for registration and browsing, but it is required before posting a job or activating provider mode. If you do not consent, those actions remain unavailable. You may withdraw consent or ask about access, correction, objection, blocking/erasure, or portability through **[insert in-app privacy request path]** or **[insert DPO email]**. Withdrawal does not affect processing already lawfully completed and may not override a documented legal hold or legal-claim requirement. It may remove your verified status and the features that depend on it.

If verification fails, you can correct your account details, submit clearer evidence, or request review by a different trained reviewer. A failed check does not automatically mean fraud.

Read the complete [KAILA Privacy Policy](/privacy) for KAILA's legal identity, contact information, data-subject rights, complaint process, security practices, and other processing activities. You may also file a complaint with the Philippine National Privacy Commission.

## Consent control

> [ ] I have read the Identity Verification Notice. I freely and specifically consent to KAILA collecting and using my government-issued ID and selfie for the identity-verification purposes described above. I understand that I can register and browse without consenting, but I cannot post a job or activate provider mode until verification is complete.

**Primary action:** I agree — start verification

**Secondary action:** Cancel

The API must reject a consent event unless it records all of: authenticated user, `identity-verification-1.0`, privacy-policy version, declared purpose, affirmative action, server timestamp, request identifier, and the role/action that triggered the gate. A general `data_privacy_consent` boolean is insufficient.

## Capture guidance

### ID

Use your own valid, unexpired government-issued ID. Place it on a plain surface with all corners visible. Avoid glare and blur. KAILA will ask for the back only when it contains information needed to validate that ID type.

Do not upload another person's ID. Do not send identity documents through chat, email, or support tickets.

### Selfie

Take a new selfie in good light. Keep your face visible and follow the on-screen action. KAILA does not accept a gallery image for this step.

## Status and decision copy

| State | User-facing copy |
| --- | --- |
| Uploading | Protecting and uploading your documents… |
| Submitted | Your identity check is in review. We will notify you when it is ready. |
| Approved | Identity verified. Your documents are scheduled for deletion under KAILA's retention policy. |
| Needs resubmission | We could not complete the check with these images. No fraud decision was made. Review the reason and try again. |
| Rejected | We could not verify your identity. You may request a review by a different reviewer. |
| Service unavailable | Verification is temporarily unavailable. Your job or provider profile has not been submitted. Try again later. |
| Consent withdrawn | Verification stopped. Uploaded evidence is scheduled for deletion unless a documented hold applies. |

Never display full ID numbers, birth dates, or addresses in status messages, notifications, analytics, URLs, logs, or reviewer notes.

