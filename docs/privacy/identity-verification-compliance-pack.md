# KAILA identity-verification compliance pack

| Field | Value |
| --- | --- |
| Owner | KAILA Data Protection Officer (DPO) |
| Status | **Pre-launch control — processing is prohibited until every launch gate is approved** |
| Version | Draft 1.0 — 2026-08-27 |
| Scope | Government-issued ID and a live selfie used to verify clients and providers in the Philippines |

This document is KAILA's privacy impact assessment, control specification, and launch checklist for identity verification. It does not itself authorize collection. The DPO must sign the completed approval record at the end of this document before production collection begins.

## 1. Proposed processing and product rule

KAILA proposes one identity-verification status per natural person, shared across client and provider modes.

- A client may register and browse without identity verification, but must be verified before the first job request is submitted.
- A person registering with provider intent must be verified before the provider profile can be activated, published, or used to offer or accept work.
- An existing client adding provider mode must be verified first if the account does not already have a valid verification.
- A verified person is not asked to resubmit merely because they add another mode. Re-verification is limited to expiry, credible compromise, a material identity change, or a documented risk event.
- KAILA displays only a neutral **Identity verified** status. It never exposes the ID, selfie, ID number, address, birth date, or verification evidence to another user.
- Verification means that submitted evidence passed KAILA's identity checks. It is not a character reference, background check, guarantee of safety, or guarantee against fraud.

The initial release must use trained human review. Automated facial recognition, biometric templates, duplicate-face searching, emotion inference, criminal/background checks, and third-party enrichment are out of scope and require a new PIA, lawful-basis review, vendor assessment, notice, and architecture decision.

## 2. Purpose, necessity, and proportionality

### Specified purposes

1. Reduce impersonation and use of fabricated identities in an in-person local-services marketplace.
2. give each job participant reasonable assurance that KAILA has checked the counterparty's identity evidence;
3. investigate account takeover, impersonation, safety reports, and transaction disputes; and
4. prevent a rejected or suspended identity from being represented as verified without a new authorized review.

The data must not be used for advertising, public profiles, AI training, unrelated analytics, credit scoring, employee monitoring, contact discovery, or sale.

### Necessity assessment

| Group/action | Risk without verification | Less intrusive controls considered | Decision |
| --- | --- | --- | --- |
| Register or browse as client | Low; no counterparty exposure yet | Email/phone verification, rate limits, device/session controls | Do not collect ID/selfie |
| Submit first client job | A provider may travel to and enter a client's premises; scams, false locations, and impersonation can expose the provider | Verified contact details, abuse throttles, payment checks, reporting | ID/selfie may be required immediately before first submission, subject to the controls below |
| Activate provider mode | A provider may enter homes, receive location/contact details, and solicit or accept work | Credential review, ratings, contact verification, moderation | ID/selfie is required before activation |
| Continue using an already verified second mode | No additional identity assurance is gained by duplicate collection | Reuse the existing status | Never recollect solely because the role changes |

The DPO must revisit mandatory client verification after the pilot using documented fraud and safety evidence. If less intrusive controls provide comparable protection, KAILA must narrow or remove the requirement.

## 3. Data inventory and lawful criteria

Government-issued identifiers and information shown on an ID are sensitive personal information under Section 3(l) of Republic Act No. 10173. A face photograph/selfie is personal data and must be treated as sensitive identity evidence; any technical extraction or automated comparison would increase the biometric and profiling risk.

| Data | Collection/use | Lawful criterion | Stored result |
| --- | --- | --- | --- |
| ID front, and back only where required to validate the chosen ID | Authenticity, expiry, name/photo comparison | Prior, specific and informed consent under DPA Section 13(a) | Encrypted raw object for the short review period only |
| Live selfie | Human comparison with the ID portrait and basic liveness/challenge review | Prior, specific and informed consent under DPA Section 13(a) | Encrypted raw object for the short review period only |
| ID type, issuing country, and expiry month/year | Eligibility and re-verification scheduling | Same consent | Minimized verification record |
| Full ID number | Only if essential for document authenticity; otherwise mask before storage | Same consent | **Do not retain**; if a selected verification method requires it, record only a keyed one-way duplicate-prevention token after a separate DPO review |
| Name and date-of-birth comparison outcomes | Confirm the account holder matches the evidence and is at least 18 | Same consent | Boolean/mismatch reason; do not duplicate the full values when already held in the account |
| Consent event | Demonstrate notice and permission | Compliance/accountability | Notice version, consent version, purpose, timestamp, user ID, request ID; never store raw IP where a keyed security fingerprint suffices |
| Review decision and reason code | Apply verification status and support appeal | Contract performance and protection/defense of lawful rights as applicable; confirm with counsel | Decision, reason code, reviewer ID, timestamps, expiry/review date |
| Access and deletion audit | Accountability, misuse detection, incident response | Legal obligation and legitimate business/security purposes, subject to balancing | Actor, purpose/reason, action, record ID, timestamp; no image or ID content |

Consent for verification must be separate from acceptance of the Terms and general Privacy Policy. It must be an unticked affirmative action immediately before capture/upload. Refusal must not prevent registration or browsing, but KAILA must clearly explain that the person cannot submit a job or activate provider mode without completing verification.

If consent is withdrawn before a decision, processing stops and uploaded evidence is queued for deletion. After a decision, KAILA must stop any consent-only processing, remove/restrict the verification-dependent capability as appropriate, and erase evidence unless a documented legal claim, active appeal, fraud investigation, or legal hold supplies another lawful criterion. Withdrawal must be as easy to initiate as giving consent.

## 4. Data flow and repositories

1. The authenticated user opens the verification gate and receives the short-form notice.
2. The server creates a single-use, purpose-bound verification session after recording specific consent.
3. The user captures/uploads the minimum necessary ID side(s) and a fresh selfie. Gallery upload for the selfie is prohibited.
4. Files travel over TLS directly to a dedicated private identity-evidence store and enter quarantine.
5. Malware/file-signature validation and safe image decoding occur before reviewer access. Metadata not required for review is stripped.
6. An authorized reviewer receives a watermarked, non-cacheable preview. Access requires a reason and creates an immutable audit event.
7. The reviewer records an approved, rejected, needs-resubmission, or escalated decision using bounded reason codes. Free text must not contain copied ID data.
8. The user receives the decision and a manual appeal path. The public product receives only the status needed to enforce the gate and display the badge.
9. Raw evidence is automatically destroyed according to Section 5. The purge produces a content-free deletion audit and is monitored for failures.

Approved production repositories, geographic region, backup behavior, encryption/key owner, subprocessors, and deletion guarantees must be entered in the approval record. Developer laptops, public buckets, application logs, analytics, crash reports, support tickets, email, chat, and the existing general provider-credential store are prohibited repositories.

## 5. Retention and disposal schedule

| Record | Normal retention | Exception | Disposal |
| --- | --- | --- | --- |
| Abandoned/unsubmitted captures | Maximum 24 hours | None | Automated hard deletion from live store and lifecycle deletion from temporary copies |
| Approved raw ID and selfie | 30 calendar days after final approval | Active appeal, documented fraud/safety investigation, or legal hold | Cryptographic/object deletion plus lifecycle expiry from backups |
| Rejected/resubmission raw evidence | 30 calendar days after appeal window closes, or 60 days after decision if no appeal | Active appeal, investigation, or legal hold | Same as above |
| Verification decision record | Account life plus 2 years after closure | Longer only under a recorded legal hold or applicable legal requirement | Delete or irreversibly anonymize |
| Consent and reviewer/access/deletion audit | Account life plus 2 years after closure | Legal hold | Delete or irreversibly anonymize |
| Keyed duplicate token, if later approved | Not authorized in the initial release | Requires separate DPO approval | Not applicable |

The two-year post-closure period is a KAILA policy choice for complaints and legal claims, not permission for indefinite storage. Counsel and the DPO must confirm it against KAILA's actual claims periods and business needs before launch. Holds must identify an owner, reason, scope, start date, review date, and release event. A hold freezes only the minimum relevant records.

Backups must have a documented maximum expiry. Deleted evidence must not return during restoration; restoration procedures must replay tombstones/purge queues before the system becomes available.

## 6. Access and security control matrix

| Capability | User | Verification reviewer | Senior privacy/safety reviewer | Support | Developer/DBA | Other marketplace users |
| --- | --- | --- | --- | --- | --- | --- |
| Submit own evidence | Yes | No | No | No | No | No |
| View own raw evidence | No direct download; rights request workflow | No | No | No | No | No |
| View review preview | No | Assigned cases only | Escalations/appeals only | No | No standing access | No |
| Decide a case | No | Yes | Appeals/escalations | No | No | No |
| View verification status | Own status | Assigned cases | Authorized case | Minimum status needed to assist | No standing access | Badge/status only where intended |
| Export evidence | Rights-response custodian only after identity confirmation | No | Dual-approved exception | No | No | No |
| Delete/release hold | Request only | No | DPO-authorized workflow | Request only | Automated job/operator cannot view content | No |

Mandatory safeguards:

- dedicated private object prefix/bucket and dedicated asset purpose; deny public ACLs and unsigned direct reads;
- TLS in transit and strong encryption at rest, with managed keys, rotation, separation of key and storage administration, and emergency revocation;
- least privilege, MFA for reviewers, short sessions, managed devices, no shared accounts, quarterly access recertification, and immediate offboarding;
- purpose-bound authorization on every object read, non-cacheable responses, short-lived server-mediated previews, visible user/case/timestamp watermark, and disabled bulk download;
- file size/type limits, MIME and magic-byte validation, safe image re-encoding, PDF active-content rejection, malware scanning, and quarantine by default;
- structured logs and error reporting that redact filenames, document values, image data, signed URLs, and request bodies;
- immutable access, decision, export, hold, and purge audits with alerting for bulk/unusual access;
- automated retention jobs with failure alerts, retry, reconciliation against object storage, and quarterly sampled deletion tests;
- secure development/testing using synthetic evidence only; production ID/selfies are prohibited in local, staging, screenshots, fixtures, demos, and AI tools;
- annual privacy/security training plus identity-review handling training for every authorized reviewer; and
- incident response integrated with KAILA's breach plan, including assessment of NPC and data-subject notification within the legally required period where applicable.

## 7. Fairness, accuracy, and user rights

- Support Philippine IDs that KAILA can reliably review. Publish the accepted-ID list and a privacy-preserving alternative/manual path for users whose ID is damaged, non-standard, or inaccessible.
- Do not infer sex, ethnicity, religion, disability, socioeconomic status, or character from identity evidence.
- A failed technical or document-quality check is not fraud. Use neutral reason codes and permit resubmission.
- No final rejection or suspension may be based solely on automation. The initial release contains no automated face match.
- Appeals must be reviewed by a different trained person, with the result and reason recorded.
- Rights requests cover notice, access, correction, objection/withdrawal, erasure/blocking, portability where applicable, complaint, and information about any automated processing. Responses must not expose security techniques or another person's data.
- The rights workflow must strongly authenticate the requester without demanding another reusable copy of the same ID unless necessary and proportionate.
- KAILA is for users aged 18 or older. An underage or uncertain-age case is escalated and not activated; identity evidence is deleted under the rejected-evidence schedule.

## 8. Processor/vendor requirements

The initial implementation may remain first-party. No identity vendor, cloud vision API, OCR service, analytics SDK, customer-support tool, or AI model may receive evidence until due diligence and a written processing agreement are complete.

The assessment and contract must cover instructions and purpose limits, data categories, storage/processing countries, subprocessors and advance notice, encryption and key custody, named access roles, training, audit evidence, breach notice to KAILA early enough to meet KAILA's deadlines, rights-request assistance, retention and certified deletion including backups, return/deletion at termination, prohibition on advertising/model training/product improvement, government-request handling, business continuity, exit/portability, and KAILA's right to audit. Cross-border processing requires a documented transfer assessment and comparable protection.

## 9. Risk register

| Risk | Inherent level | Required treatment | Residual acceptance owner |
| --- | --- | --- | --- |
| Identity theft after breach | Critical | Short raw retention, encryption, separate store/keys, no full-number retention, access anomaly alerts, tested response | DPO + security owner |
| Reviewer misuse or screenshots | High | Managed devices, watermark, no downloads, audit/alerts, training, sanctions, least privilege | Operations + DPO |
| False rejection or bias | High | Human review, accepted-ID testing, neutral codes, resubmission and independent appeal, outcome monitoring | Trust/safety + DPO |
| Excess collection or purpose creep | High | Fixed schema, prohibited-use list, change control and new PIA for expansion | Product owner + DPO |
| Raw evidence surviving deletion/backups | High | Lifecycle policies, tombstone replay, reconciliation and deletion tests | Infrastructure owner |
| Vendor reuse/cross-border exposure | High | DPA, transfer review, no training/reuse, subprocessor control, deletion evidence | Procurement + DPO |
| Mandatory consent not freely understood | High | Separate plain-language consent, just-in-time notice, browse/register without verification, clearly stated consequence | DPO + counsel |
| Badge overstates safety | Medium | Exact badge language and safety disclaimer; no “trusted” or “fraud-free” claim | Product/content owner |
| Existing credential approval creates false identity badge | High | Separate identity-verification record; remove identity meaning from generic credential approvals | Engineering + DPO |

Residual high or critical risk cannot be accepted by engineering. It requires a written DPO decision and, where legal interpretation is involved, counsel confirmation.

## 10. Operational procedures required before launch

The following runbooks and evidence must exist and be tested:

1. reviewer onboarding, assignment, decision, escalation, and offboarding;
2. user resubmission and independent appeal;
3. access, correction, withdrawal/objection, export, and erasure/blocking requests;
4. retention purge, failed deletion, backup restoration, and legal-hold release;
5. suspected reviewer misuse, account takeover, forged document, and personal-data breach;
6. vendor outage, termination, subprocessor change, and verified deletion;
7. quarterly access review and quarterly retention/deletion sample;
8. annual PIA review and event-driven review after material product, law, vendor, data, or threat changes; and
9. metrics using aggregate counts only: completion, resubmission, rejection, appeal, reversal, reviewer access, purge failure, and incident rates.

## 11. Registration and governance

Because this system processes high-risk identity evidence and may affect access to marketplace work, KAILA must treat the processing as likely to pose risk to data-subject rights. Before launch, the DPO must verify KAILA's current NPC registration status and register/update the DPO and Data Processing System in the National Privacy Commission Registration System as required by NPC Circular No. 2022-04. If KAILA claims exemption, the DPO must retain the required notarized declaration and documented assessment; the risk profile in this PIA makes exemption unlikely even below the employee and 1,000-record thresholds.

The identity-verification system must be included in KAILA's Privacy Management Program, records of processing/data inventory, security policies, training, incident-response plan, business-continuity plan, processor register, rights-request procedure, and annual review.

## 12. Launch gate and approval record

Production collection is **blocked** until all entries are complete. An unchecked item is a release blocker.

- [ ] Corporate PIC name, address, registration details, and DPO contact are present in the notice.
- [ ] DPO/DPS registration or documented exemption has been completed and evidence retained.
- [ ] Counsel confirms the lawful criteria, mandatory-consent design, accepted IDs, two-year post-closure period, and claims/hold rules.
- [ ] The DPO approves this PIA and records residual-risk decisions.
- [ ] The versioned full notice and separate just-in-time consent in `identity-verification-notice-and-consent.md` are finalized and localized as required.
- [ ] Product flows implement the proposed gates without duplicate collection and without dark patterns.
- [ ] Identity evidence uses a separate private schema/store and cannot make a generic provider credential an identity badge.
- [ ] Repository region, encryption, key custody, backup expiry, and deletion controls are documented and tested.
- [ ] Access matrix, MFA, managed-device requirements, audits, alerts, and quarterly review are operating.
- [ ] Retention and hold jobs pass live-store, failure/retry, and restored-backup deletion tests.
- [ ] Reviewer, appeal, rights, incident, and vendor runbooks have named trained owners and rehearsal evidence.
- [ ] Any processor has passed due diligence, signed required terms, disclosed locations/subprocessors, and demonstrated deletion.
- [ ] Security testing covers authorization, cross-user access, uploads, malicious files, object URLs, logs, rate limits, replay, consent evidence, and status enforcement.
- [ ] Accessibility, small-phone, Android, desktop, large-text, loading, failure, resubmission, and offline-interruption states pass QA.
- [ ] Public/privacy copy and in-product wording say “Identity verified,” never “safe,” “trusted,” or “fraud-free.”
- [ ] A feature flag defaults off and rollback deletes or lawfully quarantines already collected evidence.

| Approval | Name | Decision/date | Evidence/reference |
| --- | --- | --- | --- |
| DPO / PIA and residual risk |  |  |  |
| Philippine legal counsel |  |  |  |
| Security owner |  |  |  |
| Trust and safety/operations owner |  |  |  |
| Product owner |  |  |  |
| Production release owner |  |  |  |

## 13. Authoritative references

- [Republic Act No. 10173, Data Privacy Act of 2012](https://privacy.gov.ph/data-privacy-act/)
- [Implementing Rules and Regulations of the Data Privacy Act](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/)
- [NPC Circular No. 2023-06, Security of Personal Data in the Government and Private Sector](https://privacy.gov.ph/wp-content/uploads/2024/05/2023-compendium-2.pdf)
- [NPC Circular No. 2023-07, Guidelines on Legitimate Interest](https://privacy.gov.ph/wp-content/uploads/2024/01/NPC-Circular-No.-2023-07_Guidelines-on-Legitimate-Interest_13-December-2023.pdf)
- [NPC registration FAQ and Circular No. 2022-04 thresholds](https://privacy.gov.ph/pips-and-pics/faqs/)
- [NPC statement on selfie verification](https://privacy.gov.ph/statement-of-privacy-commissioner-john-henry-naga-on-selfie-verification-in-sim-card-registration/)
- [NPC data-subject rights guidance](https://privacy.gov.ph/data-subject-rights/)

