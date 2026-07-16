# Phase 8 Android release runbook

## One-time setup

1. Create the Firebase Android application `com.kaila.marketplace` in the organization-owned production project.
2. Add `ANDROID_GOOGLE_SERVICES_BASE64`, `ANDROID_KEYSTORE_BASE64`, `ANDROID_STORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` to the protected `android-production` GitHub environment. Require reviewer approval.
3. Host `/.well-known/assetlinks.json` on `https://app.kaila-app.com` with package `com.kaila.marketplace` and the Play App Signing SHA-256 fingerprint.
4. Complete the Play Console App content, privacy policy, Data safety, content rating, target audience, ads, and account-deletion declarations.

## Build and promote

1. Confirm main quality and Android CI pass for the exact commit.
2. Dispatch **Android release** with a semantic `version_name` and a strictly increasing integer `version_code`.
3. Download the immutable AAB artifact, record its SHA-256, and upload it to the Internal testing track. Do not distribute an APK from KAILA servers.
4. Run Play pre-launch and review compatibility, security, accessibility, and crash findings. Critical/high findings block promotion.
5. Promote the same AAB through closed testing and production only after the checklist below is signed.

## Device and lifecycle matrix

Test at minimum Android 8, 13, 14, and the current target API on an entry-level physical device plus one Samsung and one other OEM device. For each supported role/account, verify cold start, foreground/background/terminated notification actions, trusted/untrusted deep links, notification denial, location denial, offline launch/recovery, token rotation, account switch, logout, app upgrade with an active session, and server/web rollback compatibility.

Foreground location must stop when the app loses the required foreground capability. No test may observe background collection, full-screen intent, persistent alarm, repeating sound, sensitive lock-screen text, or a self-update prompt.

## Rollback

Stop rollout in Play Console and retain the last known-good web/API compatibility window. Android version codes cannot be reused. If the managed web release is incompatible, roll the web/API deployment back using the Phase 7 runbook while keeping the signed mobile artifact unchanged. Revoke compromised signing or Firebase credentials through their owning consoles and record the incident.
