import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isPublicPath,
  normalizePublicPath,
} from "./public-routes.ts";

const realtimeProvider = readFileSync(
  new URL("./realtime-provider.tsx", import.meta.url),
  "utf8",
);

test("normalizePublicPath trims trailing slashes and query strings", () => {
  assert.equal(normalizePublicPath("/download/"), "/download");
  assert.equal(normalizePublicPath("/download?utm=qr"), "/download");
  assert.equal(normalizePublicPath("/"), "/");
});

test("isPublicPath treats download as public", () => {
  assert.equal(isPublicPath("/download"), true);
  assert.equal(isPublicPath("/download/"), true);
  assert.equal(isPublicPath("/home"), false);
});

test("realtime skips ticket requests on shared public routes", () => {
  assert.match(realtimeProvider, /from "\.\/public-routes"/);
  assert.match(realtimeProvider, /isPublicPath\(normalizePublicPath\(pathname\)\)/);
  assert.doesNotMatch(realtimeProvider, /const PUBLIC_PATHS = new Set/);
});
