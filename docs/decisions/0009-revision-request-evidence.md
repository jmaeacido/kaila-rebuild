# Decision 0009 — Revision-request evidence

## Decision

Media attached by a client while requesting a correction is stored as private, scan-gated
revision evidence. Each record is tied to both the job and the immutable completion submission
being reviewed. A request may contain at most five JPG, PNG, WebP, or PDF files of 10 MB each.

The request reason remains in the immutable job timeline. Evidence is uploaded only after the
server accepts the lifecycle transition, so a failed upload cannot falsely imply that the job
is still awaiting client review. The UI reports partial upload failure and preserves the
accepted correction request.

Provider proof after completing corrected work remains part of the next immutable completion
cycle; it is not revision-request evidence.
