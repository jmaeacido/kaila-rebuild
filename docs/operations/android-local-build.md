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

## Distribution channels

Consumer Android builds use two Gradle flavors (ADR 0059):

- **Direct** (`android:debug` / `android:direct`): website APK with in-app
  self-update. May declare `REQUEST_INSTALL_PACKAGES`.
- **Play** (`android:bundle` / `android:play`): signed App Bundle for Play
  Console. Must not declare `REQUEST_INSTALL_PACKAGES` or ship the direct
  installer.

Both keep package ID `com.kaila.marketplace` and the managed origin
`https://app.kaila-app.com`.

## Direct debug APK

Direct debug APKs use the same `versionCode` and `versionName` as Play bundles.
Set them for the current PowerShell session before building:

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
apps\mobile\android\app\build\outputs\apk\direct\debug\app-direct-debug.apk
```

A successful Direct build also copies that APK to
`apps\web\public\downloads\kaila-android.apk` and updates
`apps\web\src\app\android-download.ts` so `/download` shows the matching
`versionName` and `versionCode`. Play builds must not overwrite that website
artifact.

Set `KAILA_APP_ORIGIN` before building only when testing another HTTPS consumer
host reachable by the Android device.

## Signed Play App Bundle

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

The signed Play Console artifact is written to:

```text
apps\mobile\android\app\build\outputs\bundle\playRelease\app-play-release.aab
```

Verify with `pnpm --filter @kaila/mobile android:verify:play` after the build.
That check fails if the AAB still contains `REQUEST_INSTALL_PACKAGES` or the
direct updater class.

`google-services.json` is also required for real push-notification testing. Copy
the organization-owned non-production file to
`apps\mobile\android\app\google-services.json`; it is intentionally ignored by
Git.

## External release gates

A successful local bundle is not approval to publish. Physical-device lifecycle
tests, push notification tests, Android App Links verification, Play pre-launch,
Data safety/privacy review, upgrade testing, and rollback evidence remain required.
