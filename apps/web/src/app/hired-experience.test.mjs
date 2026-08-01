import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const conversation = readFileSync(new URL("./jobs/[jobId]/hired/conversation/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./jobs/[jobId]/hired/hired.module.css", import.meta.url), "utf8");
const travel = readFileSync(new URL("./jobs/[jobId]/hired/travel/page.tsx", import.meta.url), "utf8");

test("emoji picker is categorized, scrollable, and constrained to the composer", () => {
  assert.match(conversation, /const emojiGroups =/);
  assert.match(conversation, /Work and places/);
  assert.match(styles, /max-width:calc\(100% - var\(--spacing-24\)\)/);
  assert.match(styles, /overflow-y:auto/);
});

test("travel distinguishes location failures and can resume native background navigation", () => {
  assert.match(travel, /Live location needs attention/);
  assert.match(travel, /watchId\.current = null/);
  assert.match(travel, /BackgroundNavigation\.start/);
  assert.match(travel, /void retry\(\)/);
  assert.match(travel, /screen locks/);
});
