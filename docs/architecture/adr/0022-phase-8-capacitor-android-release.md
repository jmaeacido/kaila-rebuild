# ADR-0022 — Phase 8 Capacitor Android packaging and release

**Decision date:** 2026-07-16
**Status:** Accepted

## Decision

KAILA packages the consumer application with Capacitor 8 under `apps/mobile`. Release builds use the managed HTTPS application at `app.kaila-app.com`, while an embedded branded recovery shell remains available when no origin is configured. Android bearer and rotating refresh credentials are encrypted with an Android Keystore-backed master key; browser fallback storage is not an Android credential boundary.

The native runtime handles verified HTTPS and `kaila://app` links, FCM registration/action routing, foreground/app-state reconciliation, and network recovery. Push payloads may contain only a known event type and opaque resource identifier. Unknown or malformed actions open the durable notification inbox.

The pilot requests notification and foreground location permissions only. It does not request background location or full-screen intent, create persistent/repeating alarms, implement calls, or use the legacy APK self-update mechanism. Releases are signed AAB artifacts promoted through the protected `android-production` environment.

## Consequences

- `google-services.json`, signing keys, and passwords remain secret-manager inputs and are ignored by Git.
- Android App Links require the production signing fingerprint in the hosted Digital Asset Links file.
- The release build is immutable, but its managed web application remains a separately controlled deployment; mobile/web compatibility must be included in release approval and rollback.
- Physical-device, Play pre-launch, Data safety, upgrade, and rollback evidence remain external release gates.
