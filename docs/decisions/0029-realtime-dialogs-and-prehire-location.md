# Decision 0029: Realtime dialogs and pre-hire location disclosure

**Date:** 2026-08-01  
**Status:** Accepted

## Context

Clients and providers need visible participant context throughout a job. Realtime badge-only updates are too easy to miss. Providers also need useful location context before deciding whether to offer, without exposing an exact client residence.

## Decision

- Job and offer surfaces show the relevant participant's avatar, display name, published reputation, distance context, and address context.
- Before hiring, provider-facing job requests disclose the area name and coordinates rounded to three decimal places. The client-entered landmark/address label and exact coordinates remain participant-only after hiring.
- Every durable realtime notification, including chat messages, opens a non-blocking dismissible dialog. Dialogs queue so one update never overwrites another and never trap focus away from the current task.
- The header notification bell opens a recent-notification dropdown. The full notifications page remains available only through the dropdown's **See all notifications** action or an explicit deep link.
- Notification dialogs and the dropdown link directly to their relevant job, offer, or conversation and reconcile against durable server state.

## Consequences

Rounded coordinates still disclose neighborhood-level location and must be covered by product privacy copy and user consent. Numeric distance depends on device-location permission; when unavailable, the UI explicitly reports that limitation and still shows the approximate address. Exact pre-hire coordinates must not be added without a new privacy review.
