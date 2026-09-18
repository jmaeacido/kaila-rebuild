# ADR 0072: Muted APK fallback on early-access download

## Context

ADR 0067 replaced the public Direct APK CTA with a Google Play internal-test
request form. Testers who are not yet invited (or cannot join closed testing)
still need a way to install KAILA. Direct APK hosting and in-app update metadata
remain in place for the website channel (ADR 0053 / 0059).

## Decision

1. Keep the Play early-access request form as the primary action on `#download`
   / `/download`.
2. Add a muted secondary link to `/downloads/kaila-android.apk` under the form,
   with version metadata, so uninvited users can sideload without elevating
   Direct install back to the main CTA.
3. Do not restore full sideload install step marketing in the section steps.

## Consequences

- Amends ADR 0067 consequence “Public surface no longer markets sideload install
  steps”: sideload remains available but visually secondary.
- Play invite flow stays the recommended path; Direct remains the fallback and
  website-channel update artifact.
