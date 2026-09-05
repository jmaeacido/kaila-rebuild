# Android QR links

The website-distributed consumer APK 1.0.2 (version code 3) handles the existing
`https://kaila-app.com/post-job` and `https://kaila-app.com/download` QR codes.
The former opens Post a Job (with login when required); the latter opens Home.
Both support a trailing slash. Browser users retain the existing web pages.

## Website association

Serve `apps/web/public/.well-known/assetlinks.json` at exactly these URLs:

- `https://kaila-app.com/.well-known/assetlinks.json`
- `https://app.kaila-app.com/.well-known/assetlinks.json`

Both must return HTTP 200 and JSON, without redirects or authentication.
The package is `com.kaila.marketplace`. The fingerprint was extracted using
Android SDK `apksigner verify --print-certs` from the deployed website APK.
The current distribution uses the existing debug signing identity; keep that
identity for updates, and keep its key private. An arbitrary developer's debug
certificate must not be added to the production association.

Before replacing the downloadable APK, verify its certificate matches the JSON
and the previous download. Confirm the version code increases and the embedded
Capacitor server URL remains `https://app.kaila-app.com`. The local release
session must be sourced before `android:debug`; set matching version variables
for the new download. A future Play rollout needs its own app-signing certificate.

## On-device verification

Install the update over the existing APK; do not uninstall it, which would erase
the session. With an authorized USB-debugging device:

```sh
adb install -r kaila-android.apk
adb shell pm verify-app-links --re-verify com.kaila.marketplace
# Give Android time to complete network verification, then inspect both hosts:
adb shell pm get-app-links com.kaila.marketplace
adb shell am start -W -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d https://kaila-app.com/post-job
adb shell am start -W -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d https://kaila-app.com/download
```

Check both cold and warm starts; repeat the same scan, switch between both QRs,
and check signed-in and signed-out states. Post a Job must retain its destination
through login. Home must not show a download prompt. Repeat using the actual
phone QR scanner. On a device without KAILA, verify browser fallback. Confirm a
direct `/downloads/kaila-android.apk` URL still downloads in the browser.

The commands do not force the KAILA package: resolution must come from verified
Android link handling. User-disabled supported links and embedded browsers can
keep a link in the browser. This feature cannot override those preferences.

## Rollback

Retain the previous web build, source commit and APK before deployment. If a web
smoke check fails, restore those together and restart the consumer web service.
An already installed APK cannot be downgraded normally; fix package regressions
with a higher version code. No API, database, or administrative changes are needed.
