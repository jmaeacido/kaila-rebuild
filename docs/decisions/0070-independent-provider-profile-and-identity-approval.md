# 0070 - Independent provider profile and identity approval

## Status

Accepted - 2026-09-16

## Context

Decisions 0049 and 0063 made approved account identity verification a prerequisite for activating a provider profile. This coupled two separate staff decisions: whether a marketplace profile is suitable for publication and whether the account holder's identity evidence has been approved. Operators require those reviews to proceed independently.

## Decision

1. Admin approval of a provider profile does not require an approved identity-verification record.
2. An active provider profile may appear in public discovery without a verification badge.
3. The public verified signal remains false unless the account-level identity verification is genuinely approved and current.
4. Identity enforcement remains in place for separately protected marketplace actions, including posting a first job and submitting an offer while enforcement is enabled.
5. Provider-logo approval remains required before a provider profile can be activated.

This decision supersedes only the provider-profile activation prerequisite in decisions 0049 and 0063. Their evidence handling, privacy, badge, and protected-action controls remain in force.

## Consequences

- Profile-quality review and identity review can be completed in either order.
- Clients may discover an approved provider who is not identity verified; the interface must not imply verification for that provider.
- An unverified active provider remains unable to perform identity-gated actions until verification is approved.
