# ADR 0030: Service location is selected per job

## Decision

A provider may offer service at client locations and at a saved shop at the same time. The client selects one location mode for each job: `at_client`, `at_provider`, or `remote`.

For `at_client`, the provider is the traveler and the accepted job destination is the client job pin. For `at_provider`, only providers with an enabled, reviewed shop location are matched; the client is the traveler and the accepted job freezes the provider shop pin as its destination. Remote jobs do not create travel sessions.

The accepted-offer snapshot owns the destination used throughout the hired lifecycle so later profile or job edits cannot silently redirect an active agreement. Existing `provider_traveling` status values remain as the compatibility name for the travel stage; presentation and authorization derive the actual traveler from the location mode.

## Consequences

- Home-service coverage and shop-service capability are independent provider settings.
- A provider can support either or both without duplicating their profile.
- Live GPS is shared only by the traveler and only after travel starts.
- Navigation, distance, ETA, notifications, and participant labels reverse for shop service.
