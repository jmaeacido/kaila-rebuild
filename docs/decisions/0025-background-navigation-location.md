# ADR 0025: Background-capable Android navigation location

- Status: Accepted
- Date: 2026-08-01

## Context

KAILA travel previously used the browser geolocation watcher owned by the travel page. Location updates stopped when Android suspended the WebView, so it could not provide navigation-grade tracking while the app was minimized or the screen was locked.

## Decision

The Capacitor Android application runs active navigation through a native location foreground service. The provider starts it explicitly from an accepted job. Android keeps a low-importance, ongoing notification visible for the complete sharing period and provides a Stop action from that notification.

The service:

- requests precise location through a Capacitor plugin;
- posts authenticated, ordered GPS samples to the existing participant-authorized Laravel travel endpoint;
- uses the existing mobile access token without persisting a second token copy;
- continues while the WebView is paused, the app is minimized, or the screen is locked;
- stops when the provider stops navigation or when the API reports the travel session is no longer active;
- remains non-exported so other Android applications cannot start it.

Web browsers retain screen-lifecycle geolocation as a progressive fallback because browsers cannot guarantee background GPS execution.

## Consequences

Android builds require `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, and precise location permission. A persistent notification is mandatory and is part of the user consent and stop model. The service is navigation-scoped; it is not a general background tracker. Existing 24-hour raw location retention and participant-only access remain unchanged.
