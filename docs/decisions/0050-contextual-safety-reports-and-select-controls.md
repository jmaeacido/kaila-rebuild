# 0050 — Contextual safety reports and viewport-bounded select controls

## Status

Accepted — August 28, 2026

## Decision

KAILA safety reports may be either contextual or general. Contextual entry points attach `target_type` and `target_id` through the report URL and the safety form submits them without exposing internal identifiers. A report opened directly from the Safety Center omits both fields and is reviewed as a general concern.

Safety reports accept up to five optional image, video, or PDF evidence files of 10 MB each. Evidence is stored on the private disk in quarantine, scanned asynchronously, and becomes available to authorized staff only after a clean scan and after the staff member records an access reason.

Native HTML select popups are replaced in the consumer web application by the reusable `SelectField`. Its listbox chooses above/below placement from available viewport space, bounds its height, and owns touch scrolling. A visually hidden native select preserves form serialization and required-field validation.

## Consequences

- People are never asked to locate or paste database identifiers.
- Existing job, profile, message, review, and community report links retain server-authorized target validation.
- Staff can triage general reports and request clarification when no target was attached.
- Dropdown behavior is consistent across browser and Capacitor surfaces and remains keyboard accessible.
