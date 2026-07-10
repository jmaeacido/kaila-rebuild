# KAILA Rebuild — Phase 0 ADRs and Canonical Job State Machine

**Status:** Accepted for Phase 0  
**Decision date:** 2026-07-10  
**Applies to:** New KAILA platform and all later migration work  
**Decision precedence:** Accepted ADRs → canonical state-machine specification → rebuild roadmap → proposed API contract → legacy behavior

## Review conclusion

The agreed Phase 0 decisions are internally consistent and are sufficient to begin the secure platform foundation. The following clarifications are part of the accepted design:

1. `OFFERS_RECEIVED` is a persisted lifecycle state indicating that at least one valid offer has been received. It is not recalculated from the current number of active offers and does not move backward to `POSTED`.
2. `PROVIDER_TRAVELING` is used when travel is required. A controlled direct transition from `PROVIDER_SELECTED` to `WORKING` is allowed only when travel is not required or is explicitly waived.
3. `DISPUTED` and `REVISION_REQUESTED` are branch states. There is no separate `RESOLVED` job state; resolution returns the job to an allowed canonical state or terminates it as `CANCELLED` or `COMPLETED`.
4. A revision request invalidates the current 72-hour auto-confirm deadline. A new 72-hour window starts only after the provider submits completion again.
5. A dispute pauses the active deadline. If the dispute resolves back to `COMPLETION_SUBMITTED`, the remaining time resumes; otherwise the old deadline is invalidated.
6. Client/Provider mode is a user-interface and workflow context, not a security role. Server authorization is based on account ownership, provider eligibility, job participation, and explicit policies.
7. All state changes are server-authoritative, transactional, version-checked, idempotent where applicable, and recorded in an append-only event history.

---
