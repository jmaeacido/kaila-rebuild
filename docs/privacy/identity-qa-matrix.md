# Identity-flow QA matrix

| Field | Value |
| --- | --- |
| Updated | 2026-09-11 |
| Owner | Product / release self-review |

| Case | Desktop | Mobile web | Android app | Result |
| --- | --- | --- | --- | --- |
| Happy-path consent + upload (synthetic images) | Automated API | Pending manual | Pending manual | API PASS |
| Upload failure (SVG/HTML reject) | Automated | — | — | PASS |
| Network interruption mid-upload | Pending manual | Pending manual | Pending manual | PENDING |
| Duplicate submission / expired session | Covered by session `used_at`/expiry aborts | Pending | Pending | PARTIAL |
| Withdrawal | Automated | Pending | Pending | API PASS |
| Appeal | Code path + audit | Pending | Pending | PARTIAL |
| Deletion / purge | Automated purge + tombstone | — | — | PASS |
| Inaccessible camera | UI copy for selfie camera; pending device | Pending | Pending | PENDING |
| MFA gate on admin evidence | Automated | Admin desktop | — | PASS |
| Large text / a11y | Pending | Pending | Pending | PENDING |

**Release rule:** Device PENDING rows must be completed by the release owner (or delegated tester) before claiming full operational readiness. Automated PASS alone is insufficient for the accessibility/device QA gate.
