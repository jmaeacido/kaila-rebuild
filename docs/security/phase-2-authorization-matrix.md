# Phase 2 authorization matrix

| Capability | Anonymous | Authenticated account | Eligible provider | Administrator |
| --- | --- | --- | --- | --- |
| Read active taxonomy and areas | Allowed | Allowed | Allowed | Allowed |
| Discover/read public providers | Active matching profiles | Active matching profiles | Active matching profiles | Active matching profiles |
| Switch navigation mode | Denied | Own account | Own account | Own account |
| Create/update profiles | Denied | Own profile | Own profile | Own profile |
| Upload profile assets | Denied | Private own-account key | Private own-account key | Private own-account key |
| Download quarantined/rejected asset | Denied | Denied, including owner | Denied, including owner | No public route |
| Download clean private asset | Denied | Owner or clean portfolio | Owner or clean portfolio | No public route |
| Submit credential | Denied | Own profile and asset | Own profile and asset | Own profile and asset |
| Manage taxonomy/areas | Denied | Denied | Denied | Allowed |
| Change scan/profile/review state | Denied | Denied | Denied | Allowed; clean scan required before approval |

Enforcement evidence is in `MarketplaceProfilesTest`: admin denial, owner-bound quarantined uploads, deterministic matching, inactive-profile exclusion, and badge-state tests.
