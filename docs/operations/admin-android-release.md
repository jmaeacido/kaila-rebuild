# KAILA Admin Android build and release

The admin Android application is the Capacitor package in `apps/admin-mobile`. It is
separate from the consumer/provider application and defaults to the managed origin
`https://admin.kaila-app.com`.

## Local debug APK

Install JDK 21 and Android SDK Platform 36, Build Tools 36.0.0, and Platform Tools.
Set `JAVA_HOME` and either `ANDROID_HOME` or `ANDROID_SDK_ROOT`, then run:

```bash
pnpm --filter @kaila/admin-mobile android:debug
```

The APK is written to:

```text
apps/admin-mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Set `KAILA_ADMIN_ORIGIN` before building only when testing another HTTPS admin host.

## Signed release bundle

Set `KAILA_ADMIN_ANDROID_KEYSTORE`, `KAILA_ADMIN_ANDROID_STORE_PASSWORD`,
`KAILA_ADMIN_ANDROID_KEY_ALIAS`, `KAILA_ADMIN_ANDROID_KEY_PASSWORD`,
`KAILA_ADMIN_VERSION_CODE`, and `KAILA_ADMIN_VERSION_NAME`, then run:

Create a Firebase Android app for package `com.kaila.admin` in the production FCM
project and place its organization-owned configuration at
`apps/admin-mobile/android/app/google-services.json`. Do not reuse the consumer
app's package configuration.

```bash
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
