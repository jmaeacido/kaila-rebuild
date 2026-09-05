# ADR 0052: Verified Android links for campaign QR codes

## Context

The consumer QR codes use `https://kaila-app.com/post-job` and `/download`.
The Android wrapper previously declared only `app.kaila-app.com`, and neither
host served Digital Asset Links. The runtime listened for live intents but did
not recover the original launch intent when starting from a closed app.

## Decision

- Preserve both public QR URLs. Add a separate verified HTTPS intent filter for
  exactly `/post-job`, `/download`, and their trailing-slash variants on the
  public domain. Preserve existing managed-domain and OAuth custom links.
- Keep direct `.apk` URLs and other public pages outside the new intent filter.
- Resolve trusted links to relative routes inside the managed origin; reject
  unrelated hosts, credentials, nonstandard HTTPS ports, and unsafe paths.
- Route the download QR to `/home` for installed users. The website continues
  serving the download page when no app handles the link. Existing authentication
  guards retain the requested post-job destination across login.
- Register live-link handling before reading the cold-start URL. Consume the
  cold-start URL once per WebView load and prefer a newer live intent.
- Serve the same public `/.well-known/assetlinks.json` through the consumer web
  service on both domains. It includes the certificate of the APK currently
  distributed by `/download`. Certificate
  fingerprints are public; signing keys and passwords remain outside the repo.

## Distribution and limitations

The existing direct-download APK is debug-signed, confirmed against the identical
local and production APK SHA-256. Retain its certificate for in-place upgrades;
do not silently switch existing users to a differently signed APK. The older
Phase 8 Play-only runbook differs from the current documented local-download
workflow; this change follows that existing workflow without changing signing.

The owner confirmed that users install only from `kaila-app.com/download`.
Future Play-installed copies require the actual Play app-signing SHA-256 before
verified links can be claimed for that distribution. No Play publication is
performed by this change.

Users must install the updated Android package to gain public-domain intent
handling. A scanner must hand the HTTPS link to Android; embedded browsers and
user-disabled supported-link settings may keep links in the browser. Validate
on a physical device after installing the new version.
