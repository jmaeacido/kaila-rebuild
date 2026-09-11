# ADR 0067: Public Android internal-test access request form

## Context

Public marketing previously advertised a Direct APK download at `#download` /
`/download`. Early Android distribution now goes through Google Play internal
testing. Visitors need a way to request access, and ops needs those requests in
the support inbox as KAILA-branded mail so staff can invite testers from Admin →
People (ADR 0060). Auto-inviting from the public web would bypass Play tester
limits and ops review.

## Decision

1. Replace the public APK CTA on `#download` / `/download` with an early-access
   request form (name, Google account email, optional note).
2. Add `POST /api/v1/public/android-internal-test-requests` (no auth), throttled
   as `android-test-request` (~5/hour per email+IP, ~10/hour per IP).
3. Queue `BrandedAndroidInternalTestAccessRequest` to `config('kaila.support_email')`
   via Brevo, using `<x-mail.layout>`, with Reply-To set to the requester.
4. Keep Admin-only `BrandedAndroidInternalTestInvite` as the only path that sends
   the Play internal-test link to testers. Do not auto-invite from the public form.
5. Leave Direct APK hosting for in-app update channels unchanged.

## Consequences

- Support receives branded request mail and can reply or invite from People.
- Public surface no longer markets sideload install steps.
- Coverage must assert validation, Reply-To, and support recipient routing.
