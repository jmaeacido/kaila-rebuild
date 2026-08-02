# 0045: Public search and AI crawl boundary

## Status

Accepted

## Context

KAILA needs strong public discovery through conventional search engines and AI-assisted search while keeping authenticated marketplace activity, conversations, job details, account data, and provider workflows private. The canonical production origin is `https://kaila-app.com`; the `www` host previously exposed duplicate content.

## Decision

- Use `https://kaila-app.com` as the only canonical origin and permanently redirect the `www` host.
- Index only genuinely public, server-rendered pages: the landing page, FAQs, privacy policy, and terms.
- Publish a focused XML sitemap, robots policy, web manifest, social preview images, and factual JSON-LD for the organization, website, service, and FAQs.
- Permit established search and AI user agents to crawl public content, including OAI-SearchBot, GPTBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, Google-Extended, and PerplexityBot.
- Publish `/llms.txt` as a concise, machine-readable description of the public product and its authoritative public links.
- Block private routes in `robots.txt` and reinforce the boundary with `X-Robots-Tag: noindex, nofollow, noarchive`. Private pages do not appear in the sitemap or `llms.txt`.
- Keep structured data conservative and factual. Do not claim that KAILA is a LocalBusiness, attach marketplace reviews to KAILA, expose user data, or publish unverifiable service-area facts.

## Consequences

Public information is discoverable by search engines and AI systems without making authenticated content crawlable. The apex host consolidates ranking signals. Additional service, city, or provider landing pages may be indexed only after they become intentionally public, privacy-reviewed, and server-rendered with unique content.
