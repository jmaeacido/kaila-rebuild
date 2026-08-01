# ADR 0027: Katabang uses Groq's Chat Completions API

## Status

Accepted — 2026-08-01

## Context

Katabang was presented as an assistant but implemented as a deterministic keyword router. It could not understand follow-up questions, natural language variation, or English, Filipino, and Cebuano requests beyond a few keywords.

## Decision

Katabang calls Groq's OpenAI-compatible Chat Completions API from Laravel, using the production `openai/gpt-oss-120b` model by default. The browser sends the current question and at most six bounded prior turns; credentials never leave the server. The model returns strict structured output containing an intent, short answer, one allowlisted KAILA route, and a safety-escalation flag.

The model and endpoint are configurable. Production requires `KATABANG_AI_API_KEY`. If configuration, transport, or output validation fails, the endpoint returns HTTP 503 and does not fall back to rules that masquerade as AI.

Katabang remains advisory. Its system instructions prohibit provider selection, pricing decisions, professional advice, claims of verification, and mutations to jobs or accounts. Inputs are not stored; audit data contains only message length, turn count, response ID, route, model, and safety metadata.

## Consequences

- Katabang supports genuine contextual conversation and multilingual guidance.
- The feature now depends on an external AI service and incurs latency and usage cost.
- Routes are constrained by schema and server-side validation; adding a new destination requires an intentional schema change.
- A later phase can add server-controlled read-only tools for personalized job context without exposing arbitrary application actions.
