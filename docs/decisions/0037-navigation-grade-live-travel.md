# ADR 0037: Navigation-grade live travel camera and heading

## Context

Live travel used MapLibre follow-me framing, but theme `setStyle` re-ran on every GPS
tick, the map remounted when navigation started, and null GPS headings snapped the
camera north. Observers also had no shared heading, so the traveler chevron and
camera felt broken compared with Maps/Waze.

## Decision

- Keep one MapLibre instance for the travel session; change style only when the
  resolved appearance theme changes.
- Prefer device bearing while moving; otherwise derive heading from consecutive
  samples. Persist optional `heading_degrees` on `location_samples` so observers
  and Android background sharing stay aligned.
- In traveler navigation mode, use heading-up follow camera with a short look-ahead
  offset, remaining-route emphasis, and proximity-based turn advancement. Offer
  north-up via the compass control without remounting the map.

## Consequences

Location posts may include `headingDegrees`. Clients must tolerate null headings and
keep the last good value. Style reloads remain theme-only so route layers are
repainted after `style.load`, not on every sample.
