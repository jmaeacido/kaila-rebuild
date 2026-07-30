# Android local build

KAILA's Android application is the Capacitor package in `apps/mobile`. Production
loads the managed HTTPS consumer application; the bundled web assets provide the
branded recovery experience when no managed origin is configured.

## Windows prerequisites

- Windows x86-64
- Node.js 24 and pnpm 11.13
- JDK 21 with `JAVA_HOME` configured
- Android Studio with Android SDK Platform 36, Build Tools 36.0.0, and Platform Tools
- `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) configured

Laragon may host the repository and local backend, but it is not part of the
Android compiler toolchain.

## Debug APK

From PowerShell in the repository root:

```powershell
cd C:\laragon\www\kaila
pnpm install --frozen-lockfile
pnpm --filter @kaila/mobile android:doctor
pnpm --filter @kaila/mobile android:debug
```

The APK is written to:

```text
apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

The debug command builds the embedded recovery shell. To load a development web
deployment instead, set `KAILA_APP_ORIGIN` to an HTTPS origin reachable by the
Android device before running the command.

## Signed release bundle

Never keep signing passwords or the keystore inside the repository. Set them only
for the current PowerShell session:

```powershell
$env:KAILA_APP_ORIGIN = "https://app.kaila-app.com"
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
