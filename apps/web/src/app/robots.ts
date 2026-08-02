import type { MetadataRoute } from "next";
import { SITE_URL } from "./seo";

const privatePaths = [
  "/api/",
  "/account/",
  "/account-deletion",
  "/community/",
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
        allow: ["/", "/faqs", "/privacy", "/terms", "/llms.txt"],
        disallow: privatePaths,
      },
      {
        userAgent: "*",
        allow: ["/", "/faqs", "/privacy", "/terms", "/llms.txt"],
        disallow: privatePaths,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
