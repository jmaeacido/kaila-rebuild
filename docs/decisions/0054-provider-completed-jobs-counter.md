# 0054 — Provider completed jobs counter

## Decision

Treat completed accepted jobs (`accepted_offer_snapshots` joined to `service_jobs.completed_at`) as the source of truth for a provider’s completed-job count.

On job completion (client confirm, auto-confirm, or dispute resolution to completed), increment `provider_profiles.completed_jobs` in the same transaction. Home, offers, and public profiles must expose the live count (or a reconciled denormalized column), never a stale seed value.

## Why

Home was reading `provider_profiles.completed_jobs`, but Phase 6 completion never updated that column. Providers with real completed work (for example five rated-closed jobs) still showed **Jobs Completed: 0**.

## Follow-up

Run `php artisan providers:reconcile-completed-jobs` after deploy to repair existing profiles.
