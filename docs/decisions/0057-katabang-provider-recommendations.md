# ADR 0057: Server-grounded Katabang provider recommendations

## Context

Katabang could explain KAILA workflows but could not answer requests such as
“Can you recommend a plumbing service provider?” Prompt-only recommendations
would let an external model invent providers, trust claims, or ranking criteria.
Provider eligibility and profile facts already belong to the marketplace API.

## Decision

1. Let the AI classify a `provider_recommendation` intent and return only a
   service-category query plus localized introductory copy.
2. Resolve that category against active KAILA service categories on the server.
3. Match active providers by the resolved service and, when available, the
   signed-in client’s saved area using the marketplace’s city/barangay coverage
   rules. Exclude the requester’s own provider profile.
4. Return at most five providers, ordered by rating and stable ID, with only
   server-derived trust facts and links. Provide a link to the full filtered
   provider directory.
5. Describe these as eligible matches, not endorsements. Katabang must not pick
   a winner, set a price, or claim verification that is absent from server data.

## Consequences

- Recommendation answers are grounded in current marketplace records rather
  than model memory.
- Users without a saved area receive service matches across the marketplace;
  the response does not guess their location.
- Empty and unrecognized-category results remain actionable through the
  provider directory.
- Provider cards must remain accessible, touch-friendly, and token-based on
  both Katabang surfaces.
