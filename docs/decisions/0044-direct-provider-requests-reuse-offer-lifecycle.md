# Direct provider requests reuse the offer lifecycle

## Decision

A direct service request is a normal `service_job` with a nullable `direct_provider_profile_id`. While it is pending, KAILA creates exactly one `job_opportunity`, for that provider, and grants job-conversation access only to the customer and recipient.

Provider counteroffers use the existing offer thread and revision records. A provider acceptance creates an offer revision from the requested budget or provider-confirmed amount, then selects that revision to create the existing immutable accepted-offer snapshot. From `provider_selected` onward, direct requests use the same travel, work, completion, dispute, and review lifecycle as posted jobs.

## Consequences

- Private requests cannot appear for unrelated providers.
- Existing pricing history and accepted-terms guarantees remain intact.
- Existing post-and-compare jobs remain unchanged.
- Personal contact details are not added to discovery or profile payloads.
- A request without a customer budget needs a provider-confirmed price before acceptance.
