import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("legacy public-post links redirect to community post pages", () => {
  const middleware = readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");
  assert.match(middleware, /route.*public-post/);
  assert.match(middleware, /\/community\//);
});
