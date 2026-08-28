# Consumer Android APK

Place the signed consumer APK here as `kaila-android.apk` before deploying the website.

After building the mobile app:

```powershell
Copy-Item apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk apps\web\public\downloads\kaila-android.apk
```

For production, copy the release APK you intend to distribute and update
`apps/web/src/app/android-download.ts` with the matching `versionName` and
`versionCode`.

The landing page and `/download` route link to this file. The QR code opens
`/download` on mobile so users can install from one focused page.
