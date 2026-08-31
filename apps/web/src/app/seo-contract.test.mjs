import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const layout = read("./layout.tsx");
const landing = read("./page.tsx");
const landingSeo = read("./landing-seo-section.tsx");
const structuredData = read("../lib/seo-structured-data.ts");
const faqsLayout = read("./faqs/layout.tsx");
const download = read("./download/page.tsx");
const robots = read("./robots.ts");
const sitemap = read("./sitemap.ts");
const llms = read("./llms.txt/route.ts");
const seo = read("./seo.ts");
const middleware = read("../middleware.ts");
const notFound = read("./not-found.tsx");
const nextConfig = read("../../next.config.ts");

test("public discovery metadata has a canonical origin and social previews", () => {
  assert.match(layout, /metadataBase: new URL\(SITE_URL\)/);
  assert.match(layout, /title:\s*\{[\s\S]*?template: "%s \| KAILA"/);
  assert.match(layout, /keywords:/);
  assert.match(layout, /openGraph:/);
  assert.match(layout, /twitter:/);
  assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
  assert.doesNotMatch(layout, /canonical: "\/"/);
  assert.match(landing, /publicPageMetadata/);
  assert.match(landing, /LandingSeoSection/);
  assert.match(landing, /homeStructuredData/);
  assert.match(structuredData, /"@type": "Organization"/);
  assert.match(structuredData, /"@type": "WebSite"/);
  assert.match(structuredData, /"@type": "Service"/);
  assert.match(structuredData, /SearchAction/);
  assert.match(structuredData, /"@type": "SoftwareApplication"/);
  assert.match(landingSeo, /KAILA is the local services marketplace for the Philippines/);
  assert.match(nextConfig, /value: "www\.kaila-app\.com"/);
  assert.match(nextConfig, /destination: "https:\/\/kaila-app\.com\/:path\*"/);
});

test("sitemap contains only genuinely public, indexable pages", () => {
  for (const path of ["/download", "/community", "/account-deletion", "/faqs", "/privacy", "/terms"]) {
    assert.match(sitemap, new RegExp(`path: "${path}"`));
  }
  for (const path of ["/jobs", "/messages", "/providers"]) {
    assert.doesNotMatch(sitemap, new RegExp(`path: "${path}"`));
  }
  assert.match(sitemap, /fetchPublicCommunitySitemapEntries/);
});

test("community posts are server-rendered with metadata and structured data", () => {
  const postPage = read("./community/[postId]/page.tsx");
  assert.match(postPage, /generateMetadata/);
  assert.match(postPage, /communityPostMetadata/);
  assert.match(postPage, /application\/ld\+json/);
  assert.match(postPage, /fetchPublicCommunityPost/);
  assert.match(seo, /communityPostMetadata/);
});

test("faqs and download pages expose server-rendered structured data", () => {
  assert.match(faqsLayout, /faqPageStructuredData/);
  assert.match(faqsLayout, /application\/ld\+json/);
  assert.match(download, /androidAppStructuredData/);
  assert.match(download, /BreadcrumbList/);
});

test("search and AI crawlers can read public truth without reaching private workflows", () => {
  for (const agent of ["Googlebot", "OAI-SearchBot", "GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) {
    assert.match(robots, new RegExp(`"${agent}"`));
  }
  for (const path of ["/api/", "/jobs/", "/messages/", "/community/share"]) {
    assert.match(robots, new RegExp(`"${path.replaceAll("/", "\\/")}"`));
  }
  assert.doesNotMatch(robots, /"\/account-deletion"/);
  assert.doesNotMatch(robots, /\ballow: \[/);
  assert.match(llms, /Community feed/);
  assert.match(llms, /Download KAILA for Android/);
  assert.match(llms, /KAILA is a marketplace platform, not a provider/);
  assert.doesNotMatch(llms, /\/jobs\//);
  assert.doesNotMatch(llms, /\/messages\//);
  assert.match(nextConfig, /X-Robots-Tag/);
  assert.match(nextConfig, /noindex, nofollow, noarchive/);
  assert.match(nextConfig, /\/api\/public-post\/:id/);
  assert.match(middleware, /public-post/);
  assert.match(notFound, /index: false/);
});

test("site verification can be configured through environment variables", () => {
  assert.match(seo, /KAILA_GOOGLE_SITE_VERIFICATION/);
  assert.match(seo, /KAILA_BING_SITE_VERIFICATION/);
});
