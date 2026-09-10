# ADR 0061: Admin ops dossier for People accounts

## Context

The People directory listed accounts and supported mutate actions, but operators
could not open a single account to review marketplace profiles, identity status,
recent jobs, and related ops activity in one place. Staff also needed a clear
read path without relying on the Edit dialog.

## Decision

1. Add `GET /api/v1/admin/marketplace/users/{user}` gated by
   `StaffAuthorization::canViewAccounts` (all staff roles).
2. Return an ops dossier: account (existing presenter), client profile,
   provider profile, identity summary, recent jobs (client or hired provider),
   merged activity feed, and viewer capabilities.
3. Add admin UI route `/users/[id]` with sectioned read layout and the same
   hierarchy-gated edit / activate / deactivate / delete actions as the directory.
4. Directory person names and an icon View action link into the dossier.
5. Do not expose identity document binaries or allow marketplace profile edits
   from the dossier; those stay on Identity and Review queues.

## Consequences

Staff can inspect any account dossier. Mutate permissions remain unchanged from
ADR 0039 / 0041. Activity hrefs deep-link into existing Support, Identity,
Disputes, and Reports surfaces when available.
