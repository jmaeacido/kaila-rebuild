# Android local build

KAILA's Android application is the Capacitor package in `apps/mobile`. Local
debug and release builds default to the managed HTTPS consumer application at
`https://app.kaila-app.com`. Bundled web assets remain available as the branded
recovery experience when the managed origin is unreachable.

## Windows prerequisites

- Windows x86-64
- Node.js 24 and pnpm 11.13
- JDK 21 with `JAVA_HOME` configured
- Android Studio with Android SDK Platform 36, Build Tools 36.0.0, and Platform Tools
- `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) configured

Laragon may host the repository and local backend, but it is not part of the
Android compiler toolchain.

## Debug APK

Debug APKs use the same `versionCode` and `versionName` as release bundles. Set
them for the current PowerShell session before building:

```powershell
cd C:\laragon\www\kaila
pnpm install --frozen-lockfile
. C:\secure\kaila-release-session.ps1
pnpm --filter @kaila/mobile android:doctor
pnpm --filter @kaila/mobile android:debug
```

Or set the version variables explicitly:

```powershell
$env:KAILA_VERSION_CODE = "1"
$env:KAILA_VERSION_NAME = "1.0.0"
pnpm --filter @kaila/mobile android:debug
```

The APK is written to:

```text
apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

A successful debug build also copies that APK to
`apps\web\public\downloads\kaila-android.apk` and updates
`apps\web\src\app\android-download.ts` so `/download` shows the matching
`versionName` and `versionCode`.

Set `KAILA_APP_ORIGIN` before building only when testing another HTTPS consumer
host reachable by the Android device.

## Signed release bundle

Never keep signing passwords or the keystore inside the repository. Source the
release session script (or set the version and signing variables) only for the
current PowerShell session:

```powershell
. C:\secure\kaila-release-session.ps1
pnpm --filter @kaila/mobile android:bundle
```

Or set them explicitly:

```powershell
$env:KAILA_VERSION_CODE = "1"
$env:KAILA_VERSION_NAME = "1.0.0"
$env:KAILA_ANDROID_KEYSTORE = "C:\secure\kaila-release.jks"
$env:KAILA_ANDROID_STORE_PASSWORD = "<store password>"
$env:KAILA_ANDROID_KEY_ALIAS = "<key alias>"
$env:KAILA_ANDROID_KEY_PASSWORD = "<key password>"

pnpm --filter @kaila/mobile android:bundle
```

The signed bundle is written to:

```text
apps\mobile\android\app\build\outputs\bundle\release\app-release.aab
```

`google-services.json` is also required for real push-notification testing. Copy
the organization-owned non-production file to
`apps\mobile\android\app\google-services.json`; it is intentionally ignored by
Git.

## External release gates

A successful local bundle is not approval to publish. Physical-device lifecycle
tests, push notification tests, Android App Links verification, Play pre-launch,
Data safety/privacy review, upgrade testing, and rollback evidence remain required.
