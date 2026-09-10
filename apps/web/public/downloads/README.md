# Consumer Android APK

Place the Direct-channel consumer APK here as `kaila-android.apk` before
deploying the website. This artifact is intentionally committed so the
deployment cannot publish download metadata without the corresponding file.

After a successful `pnpm --filter @kaila/mobile android:debug` (Direct) build,
the consumer APK and `/download` version metadata are copied automatically to:

- `apps/web/public/downloads/kaila-android.apk`
- `apps/web/src/app/android-download.ts`

Play App Bundles (`android:bundle`) must not replace this file. Only Direct
builds may publish website APK updates (ADR 0059).

The landing page and `/download` route link to this file. The QR code opens
`/download` on mobile so users can install from one focused page.
