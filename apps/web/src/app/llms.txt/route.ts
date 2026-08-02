import { SITE_DESCRIPTION, SITE_URL } from "../seo";

const content = `# KAILA

> ${SITE_DESCRIPTION}

KAILA is a mobile-first local services marketplace for clients and independent providers in the Philippines. Clients can post jobs and compare provider offers. Providers can discover eligible nearby work, send offers, coordinate through in-app messaging and calls, navigate to accepted job locations, complete work, and receive ratings. KAILA does not choose providers, set prices, employ independent providers, or publicly expose personal contact details.

## Public pages

- [KAILA home](${SITE_URL}/): Marketplace overview, services, client flow, and provider flow.
- [Frequently asked questions](${SITE_URL}/faqs): Authoritative answers about jobs, offers, providers, coverage, travel, safety, notifications, and support.
- [Privacy policy](${SITE_URL}/privacy): Data collection, location, navigation, messages, media, retention, and user choices.
- [Terms of service](${SITE_URL}/terms): Marketplace role, responsibilities, jobs, offers, safety, ratings, and limitations.

## Important interpretation notes

- KAILA is a marketplace platform, not a provider of the listed local services.
- Providers are independent service providers, not KAILA employees.
- Verification is shown only when KAILA has actually verified the relevant status.
- Ratings and completed-job counts come from marketplace activity and must not be inferred when absent.
- Exact job locations, messages, phone numbers, accounts, offers, and authenticated workflows are private and are not AI-crawlable.
`;

export function GET(): Response {
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
