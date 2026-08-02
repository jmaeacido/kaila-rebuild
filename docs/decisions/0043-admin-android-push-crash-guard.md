# ADR 0043: Guard admin Android FCM registration against Capacitor crash loops

## Status

Accepted — 2026-08-03

## Context

KAILA Admin Android (`com.kaila.admin`) requests notification permission through
`@capacitor/push-notifications`, then calls `PushNotifications.register()`.
Capacitor's Android `Bridge.callPluginMethod` rethrows plugin exceptions as a
main-thread `RuntimeException`. When Firebase is not initialized (missing or
mismatched `google-services.json` for `com.kaila.admin`),
`FirebaseMessaging.getInstance()` throws and the process dies.

After the user grants `POST_NOTIFICATIONS`, the next launch sees permission as
already granted and registers immediately, producing a crash loop that looks like
the app "won't start again."

## Decision

- Ship a native `AdminPushGuard` Capacitor plugin that probes Firebase Messaging
  and resolves `{ available: false }` instead of throwing.
- The admin web `AdminPushRuntime` must call `PushNotifications.register()` only
  when `AdminPushGuard` is present and reports messaging available, and only for
  an authenticated admin session.
- Keep Firebase/FCM and `AdminPushGuardPlugin` in release ProGuard rules.
- Release builds continue to require an admin-specific `google-services.json`.

## Consequences

- Builds without Firebase config no longer crash after the notification prompt;
  push simply stays unavailable until configuration and an APK rebuild land.
- Older admin APKs without `AdminPushGuard` skip registration after the admin web
  deploy, stopping the crash loop at the cost of push until the APK is updated.
- Push delivery still depends on placing the correct `com.kaila.admin` Firebase
  Android app config at `apps/admin-mobile/android/app/google-services.json`.
