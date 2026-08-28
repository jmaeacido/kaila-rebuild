import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./safety.module.css", import.meta.url), "utf8");

test("safety separates report submission from report-history loading", () => {
  assert.match(page, /loadState/);
  assert.match(page, /actionState/);
  assert.match(page, /Your details are still here/);
  assert.match(page, /onClick=\{\(\) => void load\(\)\}/);
});

test("safety gives urgent, private, and context-aware reporting guidance", () => {
  assert.match(page, /In immediate danger\?/);
  assert.match(page, /The person you report won’t see who sent it/);
  assert.match(page, /General safety concern/);
  assert.match(page, /KAILA attached it automatically/);
  assert.doesNotMatch(page, /Paste the .* ID/);
  assert.match(page, /Don’t include passwords or payment codes/);
  assert.match(page, /details\.length/);
  assert.match(page, /<AttachmentPicker/);
  assert.match(page, /Add helpful evidence/);
  assert.match(page, /camera or choose from your gallery|privately stored and safety-scanned/);
});

test("safety history has accessible status, loading, empty, and outcome states", () => {
  assert.match(page, /aria-busy="true"/);
  assert.match(page, /role="alert"/);
  assert.match(page, /dateTime=\{report\.createdAt\}/);
  assert.match(page, /data-status=\{report\.status\}/);
  assert.match(styles, /@media \(min-width:64rem\)/);
  assert.match(styles, /@media \(prefers-reduced-motion:reduce\)/);
});
