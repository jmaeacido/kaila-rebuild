# ADR 0059: Android Play and Direct distribution channels

## Context

Google Play rejected consumer version code 4 because the uploaded App Bundle
declared `android.permission.REQUEST_INSTALL_PACKAGES`. KAILA is a local-services
marketplace and does not qualify for that restricted permission. Completing an
inaccurate Play Console declaration is not acceptable.

ADR 0053 still requires website-channel APK self-update for installs from
`kaila-app.com/download`. Play-distributed copies must use Play-managed updates
instead and must not ship the direct installer surface.

## Decision

- Keep one application ID: `com.kaila.marketplace`.
- Ship two Gradle product flavors on the `distribution` dimension:
  - **`play`**: Play Console App Bundle. `DIRECT_APK_UPDATES=false`. No
    `REQUEST_INSTALL_PACKAGES`, no APK `FileProvider`, and no
    `ApkUpdatePlugin` class or registration.
  - **`direct`**: website/debug APK. `DIRECT_APK_UPDATES=true`. Retains the
    existing self-update permission, FileProvider, native plugin, and website
    publication path.
- Gate the TypeScript bridge with `Capacitor.isPluginAvailable("ApkUpdate")`.
  Store builds therefore have no callable install path; the update prompt and
  Settings action render only when the native plugin is present.
- Publish `apps/web/public/downloads/kaila-android.apk` and
  `ANDROID_DOWNLOAD` metadata only from Direct builds.
- Verify merged manifests and built artifacts by channel: Play must fail closed
  if the restricted permission or updater class appears; Direct must fail closed
  if either is missing.

## Consequences

- Play uploads use `android:bundle` / `android:play` and the
  `app-play-release.aab` artifact. Website distribution continues to use
  `android:debug` / `android:direct` and `app-direct-debug.apk`.
- ADR 0053 remains the website self-update policy; this decision splits the
  store channel so Play policy and website sideload can coexist.
- Both flavors share the package ID, so cross-channel upgrades require
  compatible signing certificates. The committed website APK remains the
  established debug-signed Direct artifact unless an explicit later decision
  changes that workflow.
- Play Console must not be asked to approve `REQUEST_INSTALL_PACKAGES`.
