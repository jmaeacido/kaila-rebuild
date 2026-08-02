# ADR 0039: Staff role hierarchy for account administration

## Context

KAILA operations previously used a flat `users.is_admin` flag. That could not
express super-admin, admin, and staff boundaries required for account directory
management.

## Decision

1. Add nullable `users.staff_role` with values `super_admin`, `admin`, and `staff`.
2. Keep `is_admin` synchronized (`true` when `staff_role` is set) so existing
   operations routes and staff fan-out continue to work.
3. Permission matrix:
   - Super admin: create/activate/deactivate/delete admin, staff, and user accounts
   - Admin: create/activate/deactivate staff and user accounts
   - Staff: view the account directory only
4. Deactivated accounts use `account_status=deactivated` and cannot sign in.
5. Seed/promote `jacido94@yahoo.com` to `super_admin`.

## Consequences

Admin app gains a People directory. Ops assignees remain any staff-role account
with `is_admin=true`. Super-admin accounts cannot delete themselves or other
super admins through this API.
