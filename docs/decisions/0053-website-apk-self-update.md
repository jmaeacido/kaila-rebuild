# ADR 0053: Website-channel APK self-update

## Context

ADR-0008 deferred APK self-update and ADR-0022 prohibited the legacy
self-update mechanism while the pilot assumed Play distribution. Decision 0052
established that consumers currently install only from
`kaila-app.com/download`. Without an in-app updater, every new build requires
users to discover the website download page manually.

The owner chose full in-app APK download with the Android package installer
handoff for the website-distributed consumer package.

## Decision

- Allow APK self-update **only** for the website-distributed consumer package
  `com.kaila.marketplace`.
- Latest package metadata comes from the managed web bundle
  (`ANDROID_DOWNLOAD` in `apps/web/src/app/android-download.ts`), currently
  version **1.0.2** / versionCode **3**.
- The downloadable artifact remains the public file at
  `https://kaila-app.com/downloads/kaila-android.apk`.
- The native wrapper downloads that HTTPS APK into app cache and launches the
  system package installer via FileProvider (`ACTION_VIEW` +
  `application/vnd.android.package-archive`).
- Do not resurrect the legacy Drive HMAC endpoints (`/api/mobile-update*`).
- Prompts are soft and dismissible (24-hour suppress for the same
  `latestVersionCode`). Force-update lockout is out of scope.
- Play-distributed builds and Play in-app updates remain out of scope until a
  later decision.

## Consequences

- ADR-0008’s APK self-update deferral and ADR-0022’s prohibition of the legacy
  self-update mechanism are superseded for the website sideload channel only.
- Rebuilds that publish a new website APK must keep `ANDROID_DOWNLOAD`
  synchronized via `publish-android-download.mjs`.
- Signing must remain the existing website APK certificate so in-place upgrades
  succeed (Decision 0052).
- Older installs without this feature still need one manual `/download` install
  before in-app updates become available.
