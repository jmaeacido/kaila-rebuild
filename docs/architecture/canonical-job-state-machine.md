# Canonical job state machine

**Status:** Accepted  
**Decision date:** 2026-07-10  
**Authority:** Accepted ADRs and this transition specification

## State definitions

| State | Meaning |
|---|---|
| `POSTED` | The validated job is published and can receive offers. |
| `OFFERS_RECEIVED` | At least one valid offer has been received; the client has not selected a provider. |
| `PROVIDER_SELECTED` | The client accepted one exact offer revision and one provider is assigned. |
| `PROVIDER_TRAVELING` | The selected provider is traveling to the service location and may share foreground location. |
| `WORKING` | The selected provider has started or resumed the work. |
| `COMPLETION_SUBMITTED` | The provider declared the work complete and submitted completion evidence; the 72-hour client review period is active unless held. |
| `REVISION_REQUESTED` | The client requested correction of a submitted completion. This is a nonterminal branch state. |
| `DISPUTED` | An eligible party raised a dispute. This is a controlled hold/branch state. |
| `COMPLETED` | Completion was confirmed by the client, confirmed by an authorized dispute outcome, or auto-confirmed after 72 hours. The seven-day review window is active. |
| `RATED_CLOSED` | Both reviews were submitted or the seven-day review window expired. The normal lifecycle is closed. |
| `CANCELLED` | The job was terminated under an allowed cancellation policy. It is terminal. |

## Transition matrix

| From | To | Authorized initiator | Required conditions / effects |
|---|---|---|---|
| New validated job command | `POSTED` | Client | Client owns the new job; required fields pass validation; publish event recorded. |
| `POSTED` | `OFFERS_RECEIVED` | System after provider command | First valid offer revision committed; job is open; provider is eligible; transaction records offer and transition. |
| `POSTED` | `CANCELLED` | Client or authorized support | No selected provider; cancellation reason recorded. |
| `OFFERS_RECEIVED` | `PROVIDER_SELECTED` | Client | Exact current offer revision is accepted; provider is eligible; no provider already selected; competing offers closed atomically. |
| `OFFERS_RECEIVED` | `CANCELLED` | Client or authorized support | Cancellation policy passes; reason recorded. |
| `PROVIDER_SELECTED` | `PROVIDER_TRAVELING` | Selected provider | Travel is required; job is not on hold; travel start recorded. |
| `PROVIDER_SELECTED` | `WORKING` | Selected provider | Travel is not required or was explicitly waived; work start recorded. |
| `PROVIDER_SELECTED` | `DISPUTED` | Client, selected provider, or support according to policy | Dispute reason/evidence recorded; resume state captured. |
| `PROVIDER_SELECTED` | `CANCELLED` | Authorized cancellation service | Cancellation policy passes; actor/reason recorded; job is not reopened. |
| `PROVIDER_TRAVELING` | `WORKING` | Selected provider | Provider starts work; active location sharing is stopped or moved to the allowed working policy. |
| `PROVIDER_TRAVELING` | `DISPUTED` | Eligible party | Dispute record and resume state created; sharing stopped. |
| `PROVIDER_TRAVELING` | `CANCELLED` | Authorized cancellation service | Cancellation policy passes; sharing stopped; reason recorded. |
| `WORKING` | `COMPLETION_SUBMITTED` | Selected provider | Completion payload/evidence validated; submission version and fresh 72-hour deadline created. |
| `WORKING` | `DISPUTED` | Eligible party | Dispute reason/evidence recorded; resume state captured. |
| `WORKING` | `CANCELLED` | Authorized cancellation service | Cancellation policy passes; reason recorded. |
| `COMPLETION_SUBMITTED` | `COMPLETED` | Client | Client confirms current completion submission; no unresolved hold. |
| `COMPLETION_SUBMITTED` | `COMPLETED` | System | Matching 72-hour deadline elapsed; no unresolved hold; command is idempotent and version-checked. |
| `COMPLETION_SUBMITTED` | `REVISION_REQUESTED` | Client | Request is within the active review period; reason required; current auto-confirm deadline invalidated. |
| `COMPLETION_SUBMITTED` | `DISPUTED` | Eligible party | Dispute is allowed within the active review period; timer paused. |
| `REVISION_REQUESTED` | `WORKING` | Selected provider | Provider acknowledges/resumes work; revision cycle recorded. |
| `REVISION_REQUESTED` | `DISPUTED` | Eligible party | Dispute reason/evidence recorded. |
| `REVISION_REQUESTED` | `CANCELLED` | Authorized cancellation/support resolution | Explicit reason and resolution record required. |
| `DISPUTED` | Prior eligible canonical state | Authorized support resolution | Resolution record specifies the target; if returning to `COMPLETION_SUBMITTED`, remaining timer resumes. |
| `DISPUTED` | `REVISION_REQUESTED` | Authorized support resolution | Resolution requires correction; old completion deadline invalidated. |
| `DISPUTED` | `COMPLETED` | Authorized support resolution | Resolution confirms completion; completion timestamp and review deadline created. |
| `DISPUTED` | `CANCELLED` | Authorized support resolution | Resolution terminates the job; reason recorded. |
| `COMPLETED` | `RATED_CLOSED` | System after second review | Both bilateral reviews submitted; both become publishable atomically. |
| `COMPLETED` | `RATED_CLOSED` | System at seven-day deadline | Deadline matches current job version; any submitted review becomes publishable; close is idempotent. |

## Explicitly forbidden transitions

- Any transition from `RATED_CLOSED` or `CANCELLED` through normal product behavior.
- Moving backward from `OFFERS_RECEIVED` to `POSTED`.
- Moving from `COMPLETION_SUBMITTED` directly to `WORKING` without a valid revision or dispute resolution path.
- Moving to `COMPLETED` because of an off-platform payment claim.
- Selecting a provider without accepting an exact immutable offer revision.
- Replacing the selected provider by editing foreign keys in place. A later reassignment policy, if needed, requires a separate ADR.
- Client-supplied arbitrary status updates.

## Required invariants

1. A job has at most one selected provider.
2. A job has at most one accepted offer thread/revision.
3. The selected provider must match the provider on the accepted revision.
4. Only the job owner may select a provider or confirm completion.
5. Only the selected provider may start travel, start/resume work, or submit completion.
6. Every lifecycle change creates an append-only job event with previous state, new state, actor, reason/command, timestamp, and correlation/idempotency identifiers.
7. Every lifecycle command checks the expected job version and increments it atomically.
8. Timer handlers verify the deadline identifier, job version, current state, and absence of holds before transition.
9. Cancellation and dispute resolution preserve historical offers, revisions, submissions, events, and reviews; they do not hard-delete history.
10. Database constraints and application policies must agree. Application validation alone is insufficient for uniqueness and referential invariants.

## Suggested machine-readable enum values

```text
posted
offers_received
provider_selected
provider_traveling
working
completion_submitted
revision_requested
disputed
completed
rated_closed
cancelled
```

## Suggested transition command names

```text
PublishJob
SubmitOfferRevision
AcceptOfferRevision
StartTravel
StartWork
SubmitCompletion
ConfirmCompletion
RequestRevision
OpenDispute
ResolveDispute
CancelJob
AutoConfirmCompletion
SubmitReview
CloseReviewWindow
```

## Phase 1 boundary

Phase 1 may create the secure framework, shared enums/value objects, transition-contract tests, idempotency/audit/outbox infrastructure, and authentication/account foundations. It must not implement the full job, offer, review, payment, feed, call, AI, analytics, self-update, or background-location feature set unless explicitly included in a later phase.
