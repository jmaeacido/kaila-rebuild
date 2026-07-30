# ADR 0011: ClamAV scanning for job media

## Status

Accepted

## Decision

Job photos and videos remain private and quarantined after upload. The API
dispatches a unique Laravel job to the `maintenance` queue. The worker streams
the object to a local ClamAV daemon with the `INSTREAM` protocol, so the
scanner never trusts a client filename or requires direct object-storage
access.

ClamAV's `freshclam` service maintains signatures. A clean result changes the
asset to `clean`; a malware signature changes it to `rejected`. Scanner,
storage, and protocol failures retry with backoff and become `failed` only
after all attempts. Only `clean` objects are downloadable.

## Consequences

- Production requires healthy `clamav-daemon`, `clamav-freshclam`, Redis, and
  the KAILA queue worker.
- The ClamAV stream limit must remain above KAILA's upload limit.
- Rejected objects remain quarantined for later incident and retention work.
- Scan errors are operational diagnostics and are not exposed to users.
