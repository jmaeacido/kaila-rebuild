# Identity-verification launch-gate status

| Field | Value |
| --- | --- |
| Owner | John Mark Agustin Estrosos Acido (sole operator) |
| Updated | 2026-09-11 |
| Companion | `identity-verification-compliance-pack.md` §12 |

**Organizational disclosure.** KAILA is a one-person operation. The same individual is PIC/operator, DPO/privacy owner, security owner, operations owner, product owner, marketing owner, and release owner. Owner sign-offs below are **self-reviews**, not independent legal, security, or audit assurances. KAILA is **not** yet a registered business; draft PIC identity is “John Mark Agustin Estrosos Acido, an individual operating the KAILA platform.”

## Gate classification (every §12 item)

| Gate | Classification | Status | Evidence / next evidence |
| --- | --- | --- | --- |
| PIC + DPO contact in notice | Code/documentation | **Complete** | Notice + Privacy Policy updated 2026-09-11 |
| DPO/DPS NPC registration or exemption | Government filing | **Pending** | “Pending determination and filing. KAILA processes identity documents and precise location; no exemption is presently claimed.” |
| Counsel confirmation | External legal review | **Pending** | “Pending — no legal counsel currently retained.” |
| DPO PIA / residual-risk approval | Internal owner approval | **Complete** | Signed 2026-09-11 in compliance pack |
| Versioned notice + JIT consent finalized | Code/documentation | **Complete** | `identity-verification-notice-and-consent.md` v `identity-verification-1.0` (English). Additional localization deferred until demand. |
| Product flows / gates / no dark patterns | Code/documentation + internal product self-review | **Complete** | Capture optional for browse/register; server enforces before post job / provider activate / offers; unticked consent; `/identity-verification` |
| Separate private schema/store; credentials ≠ identity | Code/documentation | **Complete** | `identity_*` tables + `identity-evidence*` disks; public badge from account verification only |
| Repository region, encryption, key custody, backup expiry, deletion | Mixed — docs now; backup restore replay incomplete | **Pending** | Current: local `identity-evidence-local` on host disk; TLS at edge. Missing: dedicated production bucket/region, CMK custody record, backup max-expiry, restore-time tombstone replay tests |
| Access matrix, MFA, managed devices, audits, alerts, quarterly review | Mixed | **Pending** | Access matrix + audits exist. **Admin MFA not implemented.** Managed-device policy and quarterly review schedule documented as operator commitment; not independently evidenced |
| Retention/hold jobs live-store + backup deletion tests | Mixed | **Pending** | Hourly `identity-evidence:purge` exists + feature test. Missing: identity legal-hold schema, restored-backup deletion test |
| Reviewer/appeal/rights/incident/vendor runbooks + rehearsal | Documentation + internal ops | **Pending** | Runbooks exist under `docs/privacy/runbooks/` with named owner. First tabletop rehearsal date not yet logged |
| Processor due diligence | Not applicable | **N/A** | No identity vendor/OCR/vision processor. First-party human review on KAILA-controlled systems. Re-open if a processor is added |
| Security testing (authz, uploads, malware, URLs, logs, rate limits, replay, consent, enforcement) | Mixed | **Partial — leave unchecked** | Expanded automated tests exist; no independent security assessment; coverage gaps remain (admin MFA, backup replay) |
| Accessibility / device / failure-state QA | Internal product self-review | **Pending** | No signed QA matrix for identity flows yet |
| Public/privacy wording “Identity verified” only | Code/documentation + product self-review | **Complete** | Badge + identity UX use “Identity verified”; status copy disclaims background check/safety. Generic marketing “trusted local providers” is not an identity-badge claim |
| Feature flag defaults off; rollback purge/quarantine | Code/documentation | **Complete** | Config defaults `false`; withdraw/purge/account deletion remove or quarantine evidence |

## Owner sign-off table (same person, separate decisions)

These rows intentionally repeat the same name. **One role’s signature does not satisfy another role.**

| Role | Name | Decision | Date | Nature |
| --- | --- | --- | --- | --- |
| PIC / operator | John Mark Agustin Estrosos Acido | Accept PIC identity wording for unregistered individual operator; privacy notice published | 2026-09-11 | Self-review |
| DPO / privacy owner | John Mark Agustin Estrosos Acido | PIA Approved; residual risks in pack §9 accepted with required treatments | 2026-09-11 | Self-review (not independent counsel) |
| Security owner | John Mark Agustin Estrosos Acido | Accept current technical controls as documented in `identity-verification-technical-controls.md`; **do not** claim independent assessment or admin MFA | 2026-09-11 | Self-review |
| Operations / trust & safety owner | John Mark Agustin Estrosos Acido | Accept runbooks and sole-reviewer ops model; acknowledge appeal dual-reviewer rule is temporarily unavailable in a one-person shop (escalate = pause / external help when retained) | 2026-09-11 | Self-review |
| Product owner | John Mark Agustin Estrosos Acido | Accept gate UX, accepted-ID list, and “Identity verified” wording | 2026-09-11 | Self-review |
| Release owner | John Mark Agustin Estrosos Acido | **Production identity capture remains blocked** until pending government, counsel, MFA, repository/backup, and QA gates close | 2026-09-11 | Self-review |
| Philippine legal counsel | — | Pending — no legal counsel currently retained | 2026-09-11 | External — vacant |
| Independent security auditor | — | Not retained; no independent assessment claimed | 2026-09-11 | External — vacant |

## Production blockers (must remain open)

1. NPC DPO/DPS registration or documented exemption (none claimed).
2. Retained Philippine counsel confirmation.
3. Admin MFA for identity reviewers.
4. Production evidence repository region/encryption/key custody + backup expiry + restore tombstone replay evidence.
5. Identity legal-hold + restored-backup deletion test evidence.
6. Signed accessibility/device QA for identity flows.
7. First tabletop rehearsal log for runbooks.
8. Business registration (DTI/SEC, BIR, barangay/mayor’s permit) — **not** an NPC substitute, but required before describing KAILA as a registered entity.
