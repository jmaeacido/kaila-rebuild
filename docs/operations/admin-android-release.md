# KAILA Admin Android build and release

The admin Android application is the Capacitor package in `apps/admin-mobile`. It is
separate from the consumer/provider application and defaults to the managed origin
`https://admin.kaila-app.com`.

## Local debug APK

Debug APKs use the same `versionCode` and `versionName` as release bundles.
Install JDK 21 and Android SDK Platform 36, Build Tools 36.0.0, and Platform Tools.
Set `JAVA_HOME` and either `ANDROID_HOME` or `ANDROID_SDK_ROOT`, then run:

```powershell
. C:\secure\kaila-admin-release-session.ps1
pnpm --filter @kaila/admin-mobile android:debug
```

Or set the version variables explicitly:

```powershell
$env:KAILA_ADMIN_VERSION_CODE = "1"
$env:KAILA_ADMIN_VERSION_NAME = "1.0.0"
pnpm --filter @kaila/admin-mobile android:debug
```

The APK is written to:

```text
apps/admin-mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Set `KAILA_ADMIN_ORIGIN` before building only when testing another HTTPS admin host.

## Signed release bundle

Source the admin release session script (or set the version and signing variables),
then run:

```powershell
. C:\secure\kaila-admin-release-session.ps1
pnpm --filter @kaila/admin-mobile android:bundle
```

Create a Firebase Android app for package `com.kaila.admin` in the production FCM
project and place its organization-owned configuration at
`apps/admin-mobile/android/app/google-services.json`. Do not reuse the consumer
app's package configuration. Debug APKs built without that file must not call
FCM registration; `AdminPushGuard` keeps the shell from crash-looping after the
notification permission prompt (Decision 0043).

```powershell
pnpm --filter @kaila/admin-mobile android:bundle
```

The signed AAB is written to
`apps/admin-mobile/android/app/build/outputs/bundle/release/app-release.aab`.
Keep the admin signing identity separate from the consumer application credentials.

## Release gates

Verify login, logout, session expiry, password reset, external links, file uploads,
back navigation, offline recovery, dark mode, and large text on physical devices.
Host a Digital Asset Links statement for `com.kaila.admin` using the production
signing certificate fingerprint before relying on verified App Links. Complete the
organization's private-distribution, privacy, and device-management review before rollout.
