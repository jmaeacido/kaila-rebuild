# ADR 0042: Separate Android wrapper for KAILA Admin

## Status

Accepted — 2026-08-02

## Context

The consumer/provider Android application under `apps/mobile` has native marketplace,
notification, location, and calling responsibilities. Administrative tooling is a
separate Next.js application at `admin.kaila-app.com`. Reusing the consumer package
for admin access would blur the required product boundary, collide with its Android
identity, and expose unnecessary native permissions to administrators.

## Decision

Package the existing admin web application in a separate Capacitor 8 project under
`apps/admin-mobile`, with Android application ID `com.kaila.admin` and display name
`KAILA Admin`. The wrapper loads only an explicitly configured HTTPS admin origin,
defaults to `https://admin.kaila-app.com`, disables cleartext traffic and backups,
and includes a token-based offline recovery shell.

The first release uses the admin application's existing secure cookie session. It
does not inherit consumer push, location, camera, microphone, call, or secure-token
plugins. Release signing uses admin-specific environment variables and credentials.

## Consequences

- Consumer and administrative Android releases can be installed and managed independently.
- The admin application receives only Internet permission.
- The managed web deployment must remain compatible with released WebView wrappers.
- Production acceptance requires an admin-specific signing identity, Digital Asset
  Links entry, physical-device authentication tests, and distribution-policy review.
