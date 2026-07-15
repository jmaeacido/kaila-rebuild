# Legacy-to-canonical job state mapping

**Status:** Accepted for migration design  
**Decision date:** 2026-07-16  
**Decision owner:** John Mark Agustin Acido

This mapping is subordinate to the canonical state machine. Migration must use source evidence, not labels alone. Ambiguous or internally inconsistent rows go to an exception queue and are not auto-promoted.

| Legacy status | Canonical state | Mapping rule |
|---|---|---|
| `Open` | `POSTED` | Treat as the legacy alias of an open published request only when no valid offer exists. |
| `Posted` | `POSTED` | Use when no valid offer exists. If a valid offer exists, map to `OFFERS_RECEIVED`. |
| `Offers Received` | `OFFERS_RECEIVED` | Require at least one valid historical/current offer; otherwise flag an exception. |
| `Countered` | `OFFERS_RECEIVED` | Preserve available terms as migration revisions; flag missing negotiation history rather than inventing it. |
| `Accepted` | `PROVIDER_SELECTED` | Require one accepted provider and accepted terms snapshot. Missing or multiple assignments are exceptions. |
| Navigation side-state active with `Accepted` | `PROVIDER_TRAVELING` | Use only when the selected provider and an active, eligible travel record agree. Do not infer travel from coordinates alone. |
| `In Progress` | `WORKING` | Require a selected provider. |
| `Provider Marked Done` | `COMPLETION_SUBMITTED` | Preserve the latest completion submission/evidence timestamp. Do not carry forward a legacy auto-confirm deadline without recalculation policy. |
| `Revision Requested` | `REVISION_REQUESTED` | Require a selected provider and prior completion evidence or flag an exception. |
| `Disputed` | `DISPUTED` | Create a dedicated dispute case and capture the best-supported resume state; unresolved resume-state ambiguity is an exception. |
| `Payment Released` | `COMPLETED` | This is a semantic mapping only; do not claim or migrate a payment transaction. |
| `Rated` | `RATED_CLOSED` | Treat as a legacy alias only when closure/review evidence supports it. |
| `Rated / Closed` | `RATED_CLOSED` | Preserve valid bilateral review fields and publication eligibility. |
| `Cancelled` | `CANCELLED` | Preserve actor/reason when available; never reopen automatically. |
| `Resolved` | Context-dependent | There is no canonical `RESOLVED`. Use the support outcome and surrounding event evidence to map to an allowed resumed state, `COMPLETED`, or `CANCELLED`; otherwise flag an exception. |
| Unknown, blank, or contradictory | None | Reject from automatic migration and include in the reconciliation report. |

Mapping a current state does not reconstruct facts that the legacy system did not retain. Migration records the source row identifier, source status, chosen canonical state, mapping-rule version, evidence summary, and any exception or manual decision.

