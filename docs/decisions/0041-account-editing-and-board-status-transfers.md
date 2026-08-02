# ADR 0041: Account editing and board status transfers

## Context

The People directory supported create/activate/deactivate/delete, but operators
could not edit account fields and the Board view could not move cards between
status columns.

## Decision

1. Super admins and admins may edit accounts within the existing hierarchy
   (`canEdit` mirrors status authority and excludes self/other super admins).
2. Editable fields: name, email, optional password, and assignable role
   (`admin`/`staff`/`user` per create permissions).
3. Board drag-and-drop uses native HTML5 DnD (no new dependency) and
   `POST /admin/marketplace/users/{id}/status` with
   `active|deactivated|restricted|deleted`.
4. Moving to `deleted` still requires super-admin delete authority; deleted
   accounts cannot be dragged back.

## Consequences

Board columns are actionable status lanes. Restricted status is available from
the board and blocks sign-in like deactivate.
