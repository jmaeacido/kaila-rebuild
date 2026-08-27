import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

test("file rejection uses the branded accessible dialog", () => {
  assert.doesNotMatch(page, /window\.confirm/);
  assert.match(page, /<dialog/);
  assert.match(page, /aria-labelledby="reject-file-title"/);
  assert.match(page, /Reject this submission\?/);
  assert.match(page, /Keep file/);
  assert.match(page, /Reason for rejection/);
  assert.match(page, /reason\.trim\(\)\.length < 10/);
});

test("completed file decisions remain visible in review history", () => {
  assert.match(page, /title="Review history"/);
  assert.match(page, /review\.reviewedBy\.name/);
  assert.match(page, /review\.reviewReason/);
});

test("provider and credential reviews expose complete cards and histories", () => {
  assert.match(page, /title="Provider review history"/);
  assert.match(page, /title="Credential review history"/);
  assert.match(page, /provider\.services\.map/);
  assert.match(page, /credential\.asset\.previewUrl/);
});
