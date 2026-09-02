import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchPublicCommunityFeed,
  fetchPublicCommunityPost,
  fetchPublicCommunitySitemapEntries,
} from "./community-public.ts";

async function withFetch(impl, run) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

test("public community fetches degrade when the API is unreachable", async () => {
  await withFetch(async () => {
    throw Object.assign(new TypeError("fetch failed"), {
      cause: Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:8000"), { code: "ECONNREFUSED" }),
    });
  }, async () => {
    assert.deepEqual(await fetchPublicCommunityFeed(), []);
    assert.equal(await fetchPublicCommunityPost("post-1"), null);
    assert.deepEqual(await fetchPublicCommunitySitemapEntries(), []);
  });
});

test("public community fetches degrade when the API returns an error", async () => {
  await withFetch(async () => new Response("unavailable", { status: 503 }), async () => {
    assert.deepEqual(await fetchPublicCommunityFeed(), []);
    assert.equal(await fetchPublicCommunityPost("post-1"), null);
    assert.deepEqual(await fetchPublicCommunitySitemapEntries(), []);
  });
});

test("public community feed keeps published posts when the API is available", async () => {
  await withFetch(async (input) => {
    assert.match(String(input), /\/api\/v1\/public\/community\/feed$/);
    return Response.json({
      data: [
        { id: "a", title: "First" },
        { id: "b", title: "Second" },
        { id: "c", title: "Third" },
      ],
      meta: { nextCursor: null },
    });
  }, async () => {
    assert.deepEqual(await fetchPublicCommunityFeed(2), [
      { id: "a", title: "First" },
      { id: "b", title: "Second" },
    ]);
  });
});
