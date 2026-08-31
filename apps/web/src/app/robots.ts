import type { MetadataRoute } from "next";
import { SITE_URL } from "./seo";

/** Block authenticated and utility routes only. Public pages stay crawlable by default. */
const disallowedPaths = [
  "/api/",
  "/account/",
  "/community/share",
  "/help/",
  "/home/",
  "/jobs/",
  "/messages/",
  "/notifications/",
  "/opportunities/",
  "/post-job/",
  "/provider-profile/",
  "/providers/",
  "/safety/",
  "/settings/",
  "/support/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/maintenance",
  "/status/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "GPTBot",
          "ClaudeBot",
          "Claude-SearchBot",
          "Claude-User",
          "PerplexityBot",
          "Google-Extended",
        ],
        disallow: disallowedPaths,
      },
      {
        userAgent: "*",
        disallow: disallowedPaths,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
