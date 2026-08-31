import type { MetadataRoute } from "next";
import { fetchPublicCommunitySitemapEntries } from "../lib/community-public";
import { SITE_URL } from "./seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [
    { path: "", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/download", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/community", changeFrequency: "daily" as const, priority: 0.85 },
    { path: "/faqs", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/account-deletion", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
  ];

  const staticEntries = pages.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  }));

  const posts = await fetchPublicCommunitySitemapEntries().catch(() => []);
  const postEntries = posts.map((post) => ({
    url: `${SITE_URL}/community/${post.id}`,
    lastModified: post.updatedAt ?? post.publishedAt ?? undefined,
    changeFrequency: "weekly" as const,
    priority: 0.65,
  }));

  return [...staticEntries, ...postEntries];
}
