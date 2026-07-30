# ADR 0014: Durable realtime and Android push notifications

Date: 2026-07-30

Status: Accepted

## Context

KAILA had FCM device registration and delivery jobs, but only opportunity and
offer flows created notifications. Open applications had no notification
center, and delivery did not apply message, reminder, or quiet-hour preferences.

## Decision

- One notification service creates the durable inbox record, transactional
  Socket.IO outbox event, and per-device FCM attempts.
- Durable records are the source of truth. Socket.IO invalidates the open
  client, and FCM wakes a background or closed Capacitor Android app.
- Push payloads contain a known action type and opaque resource identifiers.
  Clients map these values to allowlisted routes; payloads cannot supply a URL.
- Message and routine-reminder push delivery respects the corresponding user
  preference. Security and material job notifications cannot be disabled.
- Quiet hours never delay durable or realtime delivery. They suppress Android
  notification sound and lower transport priority.
- FCM failures retry through the configured queue worker. Inbox state remains
  available even when a device token or the provider is unavailable.
- Browser clients receive realtime in-app notifications. Background browser
  push is not enabled until a Firebase Web app and VAPID key are provisioned.

## Consequences

- Job, offer, message, travel, completion, cancellation, dispute, and review
  state changes can be seen without refreshing.
- Notification policy and device fan-out no longer need to be duplicated by
  each feature.
- Android notification taps navigate safely to the relevant KAILA screen.
