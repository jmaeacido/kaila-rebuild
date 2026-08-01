# 0032 — Customer support casework

## Decision

KAILA support is an authenticated, asynchronous case conversation shared by a customer and authorized staff. It is separate from Katabang guidance, safety reports, and job disputes. A case has a human-readable reference, category, priority, lifecycle status, assignment, messages, customer/staff read timestamps, and optional job context.

Customer actions are create, read, reply, close, and reopen. Staff actions are queue, read, assign, reply, prioritize, and resolve. Every mutation is authorized on the server, recorded transactionally, and published through the existing outbox to the customer and staff rooms. Support replies also create durable notifications.

Safety emergencies and misconduct continue through Safety/Reports; contested job outcomes continue through Disputes. Support screens link to those purpose-built workflows instead of duplicating them.

## Consequences

- Support remains operational when realtime is unavailable because clients reconcile from REST.
- Staff tooling remains visually and structurally separate from the marketplace application.
- No response-time promise is encoded until staffing coverage can support it.
