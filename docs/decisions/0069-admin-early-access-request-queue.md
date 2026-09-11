# ADR 0069: Admin Early Access request queue

## Context

Public Android early-access requests were emailed to `support@` only. Staff
needed the same requests inside Admin so they could invite testers without
depending on mailbox delivery (ADR 0067 / 0068).

## Decision

1. Persist each public submission in `android_internal_test_requests`
   (name, email, note, status).
2. Keep branded support email and also fan out
   `ops.android_test_access_request` DurableNotifications to admins.
3. Add Admin → **Early access** (`/early-access`) with pending/invited/dismissed
   filters, **Send invite** (reuses `BrandedAndroidInternalTestInvite`), dismiss,
   and reopen.
4. Route admin notification clicks to `/early-access?request={id}`.

## Consequences

- Requests remain reviewable even when outbound/inbound mail is delayed.
- Invite from the queue is the preferred staff path; People bulk invite remains.
- Coverage must assert persistence, admin list/invite, and notification routing.
