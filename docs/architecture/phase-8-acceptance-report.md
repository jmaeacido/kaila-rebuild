# Phase 8 acceptance report

**Date:** 2026-07-16
**Status:** Repository implementation complete; signed release and device/store gates pending external evidence

| Area | Repository evidence |
|---|---|
| Packaging | Capacitor 8 Android project uses package `com.kaila.marketplace`, target SDK 36, HTTPS-only traffic, no backup, minification, shrinking, and an embedded recovery shell. |
| Sessions | Android tokens use a Keystore-backed encrypted preference plugin; switching accounts clears the prior session, saves the next session, and re-registers FCM. |
| Push and links | Runtime tests constrain notification routes and reject untrusted links; the manifest declares verified HTTPS and custom fallback links. |
| Permissions and lifecycle | Notification permission is requested at runtime; only foreground location is declared; App and Network listeners reconcile resumed/online state. |
| Release | CI builds/lints/tests a debug package; a protected manual workflow materializes secrets transiently and produces a signed, minified AAB artifact. |
| Policy | ADR-0022 and the release runbook prohibit background location, full-screen/persistent alerts, self-update, and unreviewed store promotion. |

Repository-controlled validation is complete only when the JavaScript/PHP quality suites and Android CI pass. Full Phase 8 release acceptance additionally requires a real organization-owned Firebase configuration and signing identity, signed AAB compatibility/security checks, physical-device lifecycle evidence, Digital Asset Links verification, Play pre-launch results, Data safety/privacy review, and upgrade/rollback evidence. These cannot be produced without protected credentials, Android tooling/devices, and Play Console access.
