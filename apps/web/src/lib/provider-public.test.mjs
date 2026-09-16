import assert from "node:assert/strict";
import test from "node:test";
import { fetchPublicProvider } from "./provider-public.ts";

test("public provider lookup accepts opaque slugs and rejects malformed paths", async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(String(url));
    return new Response(JSON.stringify({ data: { id: 20, publicSlug: "zels-computer-store-k7m4p9x2qf" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const provider = await fetchPublicProvider("zels-computer-store-k7m4p9x2qf");
    assert.equal(provider?.publicSlug, "zels-computer-store-k7m4p9x2qf");
    assert.equal(requested.length, 1);
    assert.equal(await fetchPublicProvider("../../private"), null);
    assert.equal(requested.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
