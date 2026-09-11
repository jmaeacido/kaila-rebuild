# Tailoring service category

## Status

Accepted

## Context

Marketplace service categories are seeded from `MarketplaceReferenceSeeder` and
rendered with Lucide icons via `ServiceCategoryIcon`. Tailoring was missing from
the canonical list even though alterations and custom clothing work are common
local services on KAILA.

## Decision

Add **Tailoring** (`slug`: `tailoring`) as an active service category, ordered
immediately before **Other Services**. Use a custom Lucide-style **SewingMachine**
icon (needle bar, spool, and handwheel) so the category has a distinct mark not
shared with any other seeded service. The web map also aliases the earlier
`Scissors` value to the same artwork during rollout.

Existing environments receive the row through migration
`2026_09_11_090000_add_tailoring_service_category`; new environments receive it
from the seeder. The landing popular-services rail uses each category’s stored
icon instead of decorative placeholders.

## Consequences

- Reference-data consumers (home, post-job, provider profile, filters, Katabang)
  surface Tailoring automatically once the category is active.
- Seeder tests expect 18 active canonical categories.
- Decision 0007’s “17 canonical” count is superseded for the current product set.
