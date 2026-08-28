import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./faqs.module.css", import.meta.url), "utf8");

test("FAQ discovery supports topic browsing and useful search feedback", () => {
  assert.match(page, /Browse FAQs by topic/);
  assert.match(page, /resultCount/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /Clear FAQ search/);
  assert.match(page, /Show all questions/);
});

test("FAQ interactions remain accessible and responsive", () => {
  assert.match(page, /aria-expanded=\{open\}/);
  assert.match(page, /aria-controls=\{panelId\}/);
  assert.match(styles, /min-height:var\(--control-min-height\)/);
  assert.match(styles, /@media \(min-width:48rem\)/);
  assert.match(styles, /@media \(prefers-reduced-motion:reduce\)/);
  assert.match(styles, /var\(--color-surface\)/);
});
