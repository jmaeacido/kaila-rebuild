# ADR 0062: Separate client and provider profile images

## Status

Accepted

## Context

Users can operate as both client and provider on one account. Client profile pictures (`purpose=avatar`) and provider logos (`purpose=provider_avatar`) were introduced as separate assets, but several paths still treated a clean client avatar as the provider mark:

- Provider onboarding accepted a client avatar in place of a provider logo
- Approving a client avatar republished the provider welcome community post
- `/me` display and account UI fell back to the client picture while in provider mode

That made a client photo upload appear to overwrite the provider logo for dual-mode accounts.

## Decision

1. Provider onboarding, activation, welcome posts, and provider-mode `/me` display use only `provider_avatar`.
2. Approving a client `avatar` never rewrites provider welcome media.
3. Existing providers without a `provider_avatar` are repaired with `php artisan kaila:separate-provider-avatars` (reclassify known logos where recorded; otherwise clone the current clean client avatar into `provider_avatar`).
4. Admin people dossiers expose `client.avatarUrl` and `provider.avatarUrl` separately, with no client→provider fallback in the provider card.

## Consequences

Client and provider images can change independently. Providers who never uploaded a dedicated logo must do so (or rely on the one-time repair command) before onboarding checks pass.
