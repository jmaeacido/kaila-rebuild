import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

test("file rejection uses the branded accessible dialog", () => {
  assert.doesNotMatch(page, /window\.confirm/);
  assert.match(page, /<dialog/);
  assert.match(page, /aria-labelledby="reject-file-title"/);
  assert.match(page, /Reject this file\?/);
  assert.match(page, /Keep file/);
  assert.match(page, /Reason for rejection/);
  assert.match(page, /reason\.trim\(\)\.length < 10/);
});

test("completed file decisions remain visible in review history", () => {
  assert.match(page, /title="Review history"/);
  assert.match(page, /review\.reviewedBy\.name/);
  assert.match(page, /review\.reviewReason/);
});
