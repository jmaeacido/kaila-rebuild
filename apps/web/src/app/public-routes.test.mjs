import assert from "node:assert/strict";
import test from "node:test";
import {
  isPublicPath,
  normalizePublicPath,
} from "./public-routes.ts";

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
