import assert from "node:assert/strict";
import test from "node:test";
import { sitemapUrls, submitIndexNow } from "./submit-indexnow.mjs";

test("sitemapUrls keeps only canonical KAILA URLs", () => {
  const xml = `
    <urlset>
      <url><loc>https://kaila-app.com</loc></url>
      <url><loc>https://kaila-app.com/community/example</loc></url>
      <url><loc>https://example.com/not-kaila</loc></url>
      <url><loc>not-a-url</loc></url>
    </urlset>`;

  assert.deepEqual(sitemapUrls(xml), [
    "https://kaila-app.com",
    "https://kaila-app.com/community/example",
  ]);
});

test("submitIndexNow sends sitemap URLs and accepts initial verification", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith("/sitemap.xml")) {
      return new Response("<urlset><url><loc>https://kaila-app.com</loc></url></urlset>");
    }
    return new Response(null, { status: 202 });
  };

  assert.deepEqual(await submitIndexNow(fetchImpl), { count: 1, status: 202 });
  assert.equal(requests[1].url, "https://api.indexnow.org/indexnow");
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    host: "kaila-app.com",
    key: "617da2c3-b099-4e22-b4cc-c4986062468f",
    urlList: ["https://kaila-app.com"],
  });
});
