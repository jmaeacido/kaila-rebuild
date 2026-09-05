# Android App Links 1.0.2 validation

Date: September 5, 2026 (Asia/Manila).

## Published release

- Version: 1.0.2 (3), package `com.kaila.marketplace`.
- Download: `https://kaila-app.com/download`.
- APK SHA-256: `dd18a5d59adfc43ecedbc12d49fb5e2158eb1d64df6b300f16c0110391b5b263`.
- Production source: `d090982827fe4b53412b305eeb1d4ef4be8ae98c`.
- Previous production source: `6340346ef517b44984f8c43237bae41e2914d18d`.
- Production deployment contains only this feature, applied to the previous
  production source. Other local commits were excluded.
- Previous web build retained at
  `/home/ubuntu/kaila-app-links-backup-1.0.1/.next`.

## Passed checks

- Mobile: 25 Vitest cases and 2 Node download-publisher tests.
- Local web: 149 tests; exact production source: 145 tests.
- Mobile lint/type check, web lint/type check, root format-check command and
  `git diff --check`. The format-check command has no configured child formatters.
- Local Next production build; isolated Linux production build after building
  `@kaila/ui`; Android `android:debug` build from the managed release session.
- `apksigner verify --print-certs`: matches the existing downloadable APK's
  certificate and the published association JSON.
- `aapt2`: version 1.0.2 (3), verified HTTPS filters for both domains, public
  campaign paths scoped to Post a Job and Download.
- Embedded Capacitor origin: `https://app.kaila-app.com`.
- Both public `/.well-known/assetlinks.json` endpoints return HTTP 200 JSON
  without redirects; Google Digital Asset Links `assetlinks:check` returns
  `linked: true` for both domains and the APK certificate.
- Public download page advertises 1.0.2; public APK hash matches the local build.
- Post a Job, Home and Login return HTTP 200 after deployment. Consumer web,
  admin, realtime and queue services remain active.

## Resolved build-environment issues and remaining limits

The older production test script let Vitest collect Node's test file; rerunning
Vitest explicitly on `src` and Node separately passed. The initial isolated web
build lacked generated `@kaila/ui` output; building that workspace package first
resolved it. Neither required unrelated production code changes.

Existing non-blocking warnings remain: three Next image lint warnings,
deprecated Next middleware naming, and Android toolchain/deprecation notices.

No Android phone or configured emulator was available. Physical scanner behavior,
Android's on-device verification state, in-place installation, authenticated
cold/warm navigation and signed-out login return still require the device matrix
in `android-app-links.md`. Public association verification is not a substitute
for those tests. The owner confirmed there is no Google Play distribution.
