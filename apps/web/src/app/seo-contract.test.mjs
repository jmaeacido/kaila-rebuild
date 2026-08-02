import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const layout = read("./layout.tsx");
const landing = read("./page.tsx");
const robots = read("./robots.ts");
const sitemap = read("./sitemap.ts");
const llms = read("./llms.txt/route.ts");
const nextConfig = read("../../next.config.ts");

test("public discovery metadata has a canonical origin and social previews", () => {
  assert.match(layout, /metadataBase: new URL\(SITE_URL\)/);
  assert.match(layout, /title:\s*\{[\s\S]*?template: "%s \| KAILA"/);
  assert.match(layout, /openGraph:/);
  assert.match(layout, /twitter:/);
  assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
  assert.match(landing, /publicPageMetadata/);
  assert.match(landing, /application\/ld\+json/);
  assert.match(landing, /"@type": "Organization"/);
  assert.match(landing, /"@type": "WebSite"/);
  assert.match(landing, /"@type": "Service"/);
  assert.match(nextConfig, /value: "www\.kaila-app\.com"/);
  assert.match(nextConfig, /destination: "https:\/\/kaila-app\.com\/:path\*"/);
});

test("sitemap contains only genuinely public, indexable pages", () => {
  for (const path of ["/faqs", "/privacy", "/terms"]) assert.match(sitemap, new RegExp(`path: "${path}"`));
  for (const path of ["/jobs", "/messages", "/providers", "/account-deletion"]) assert.doesNotMatch(sitemap, new RegExp(`path: "${path}"`));
});

test("search and AI crawlers can read public truth without reaching private workflows", () => {
  for (const agent of ["Googlebot", "OAI-SearchBot", "GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) {
    assert.match(robots, new RegExp(`"${agent}"`));
  }
  for (const path of ["/api/", "/jobs/", "/messages/", "/account-deletion"]) {
    assert.match(robots, new RegExp(`"${path.replaceAll("/", "\\/")}"`));
  }
  assert.match(llms, /# KAILA/);
  assert.match(llms, /KAILA is a marketplace platform, not a provider/);
  assert.doesNotMatch(llms, /\/jobs\//);
  assert.doesNotMatch(llms, /\/messages\//);
  assert.match(nextConfig, /X-Robots-Tag/);
  assert.match(nextConfig, /noindex, nofollow, noarchive/);
});
