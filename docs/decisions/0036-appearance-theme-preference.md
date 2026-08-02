# ADR-0036: Account-synced appearance theme preference

- Status: Accepted
- Date: 2026-08-02

## Context

KAILA must support Light, Dark, and System appearance. OS-only `prefers-color-scheme` cannot force Light on a dark device (or the reverse). The product also requires the user’s choice to follow them across devices after login.

## Decision

1. Store `users.appearance_theme` as `light` | `dark` | `system` (default `system`).
2. Expose `appearanceTheme` on `/api/v1/me` and update via `PUT /api/v1/me/appearance` (mobile twins under `/auth/mobile/appearance`).
3. Resolve to a concrete `data-theme="light"|"dark"` on `<html>` so design tokens apply without media-query-only CSS.
4. Cache the preference in `localStorage` (`kaila.theme`) for FOUC-safe bootstrap; **server wins after authentication**.
5. Theme-aware brand wordmarks (`kaila-wordmark.png` / `kaila-wordmark-on-dark.png`), OpenFreeMap liberty/dark basemaps, and Capacitor StatusBar colors follow the resolved theme.

## Consequences

- Guests use System or a local cache until login.
- Appearance changes write through to the account immediately from Settings.
- Admin inherits token dark/light when `data-theme` is set; no admin Appearance UI in this change.
