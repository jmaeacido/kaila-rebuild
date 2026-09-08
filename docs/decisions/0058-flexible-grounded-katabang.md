# ADR 0058: Flexible but grounded Katabang conversations

## Context

Katabang’s original structured contract restricted every question to eight
intents and a small set of product explanations. That made safe, ordinary
marketplace questions feel unsupported and made new capabilities require schema
changes. Removing all structure would weaken navigation safety, auditability,
and protection against invented provider or account facts.

## Decision

1. Replace the fixed intent enum with a validated descriptive lower-snake-case
   intent so Katabang can represent new marketplace questions without a release.
2. Expand the grounded product brief to cover discovery, job preparation,
   hiring, communication, notifications, reviews, privacy, support, safety, and
   troubleshooting. Katabang may ask a concise follow-up when context is
   missing and may provide low-risk preparation guidance.
3. Supply the current active service-category names from Laravel on every turn.
   Provider recommendations must use those names and continue to be resolved
   against authoritative server data.
4. Keep navigation in a server-approved route allowlist. Keep provider facts,
   authorization, pricing, and account/job mutations outside model control.
5. Include the public provider matches shown in the assistant’s next-turn
   context so follow-up questions can refer to the displayed list.

## Consequences

- Katabang can answer a broader range of natural marketplace questions and can
  evolve without continually expanding an intent enum.
- Grounded categories, provider lookup, safe routes, and structured audit data
  remain deterministic.
- Answers can be longer when useful but should normally remain below 160 words.
- Professional diagnosis, invented facts, autonomous decisions, and state
  changes remain out of scope.
