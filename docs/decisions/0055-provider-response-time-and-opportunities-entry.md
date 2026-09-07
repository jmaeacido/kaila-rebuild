# 0055 — Provider response time and opportunities entry

## Decision

`provider_profiles.response_minutes` is the median of up to the last 20 first-offer response times, measured from job-opportunity match (`job_opportunities.created_at`) to the provider’s first offer revision. Values are at least 1 minute. Providers with no first offers keep `null`, which Home displays as **New**.

Refresh the denormalized column when a provider creates their first offer on a job. Expose the stored value on Home, offers, and public profiles.

The Home **Opportunities** summary card is a primary navigation control to `/opportunities` (open matches without an offer yet). The count remains open opportunities only; the link always goes to the full opportunities screen.

## Why

Response never updated after offers, so active providers incorrectly showed **New**. Opportunities was informational only; providers needed one-tap access to Find work matches.

## Follow-up

Run `php artisan providers:reconcile-response-minutes` after deploy to repair existing profiles.
