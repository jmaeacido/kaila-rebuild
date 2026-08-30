import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("./page.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("./page.module.css", import.meta.url), "utf8");

test("job requests explain and preserve the three-step journey", () => {
  assert.match(page, /\["Job details", "Location", "Review & send"\]/);
  assert.match(page, /aria-label="Job request progress"/);
  assert.match(page, /Review your request/);
  assert.match(page, /request-summary-title/);
  assert.match(page, /resolvedAreaLabel \|\| "Location pinned"/);
});

test("location controls prioritize choosing and adjusting a pin", () => {
  assert.match(page, /Use my current location/);
  assert.match(page, /Adjust on map/);
  assert.match(page, /Remove this pin/);
  assert.doesNotMatch(page, /variant="danger" onClick=\{clearPin\}/);
});

test("mobile job actions share one compact sticky row", () => {
  assert.match(page, /data-has-back=\{step > 1\}/);
  assert.match(styles, /footer\[data-has-back="true"\][^{]*\{[^}]*grid-template-columns:/);
  assert.match(styles, /min-height:\s*var\(--control-min-height\)/);
});

test("a provider selected from discovery receives a private request only", () => {
  assert.match(page, /get\("providerId"\)/);
  assert.match(page, /directProvider \? `\/api\/v1\/providers\/\$\{directProvider\.id\}\/direct-requests` : "\/api\/v1\/jobs"/);
  assert.match(page, /if \(!directProvider\) \{/);
  assert.match(page, /`\$\{directProvider\.displayName\} received your private request\./);
});
