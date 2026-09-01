# Consumer Android APK

Place the signed consumer APK here as `kaila-android.apk` before deploying the
website. This artifact is intentionally committed so the deployment cannot
publish download metadata without the corresponding file.

After a successful `pnpm --filter @kaila/mobile android:debug` build, the
consumer APK and `/download` version metadata are copied automatically to:

- `apps/web/public/downloads/kaila-android.apk`
- `apps/web/src/app/android-download.ts`

For production, copy the release APK you intend to distribute if it is not
produced by the debug build, then run a release build so the version metadata
stays in sync.

The landing page and `/download` route link to this file. The QR code opens
`/download` on mobile so users can install from one focused page.
