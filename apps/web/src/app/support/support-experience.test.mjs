import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const conversation = readFileSync(new URL("./[caseId]/page.tsx", import.meta.url), "utf8");
const supportHub = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./support.module.css", import.meta.url), "utf8");

test("support conversation preserves drafts and separates action errors from loading", () => {
  assert.match(conversation, /if \(action === "reply"\) setMessage\(""\)/);
  assert.match(conversation, /const \[isLoading, setIsLoading\]/);
  assert.match(conversation, /const \[activeAction, setActiveAction\]/);
  assert.match(conversation, /await responseMessage\(response/);
  assert.match(conversation, /Try again/);
});

test("support conversation presents context and an intentional close flow", () => {
  assert.match(conversation, /statusLabels/);
  assert.match(conversation, /categoryLabels/);
  assert.match(conversation, /Close this request\? You can reopen it later\./);
  assert.match(conversation, /aria-live="polite"/);
  assert.match(conversation, /dateTime=\{item\.createdAt\}/);
});

test("support conversation remains touch-friendly and responsive", () => {
  assert.match(styles, /min-height:var\(--control-min-height\)/);
  assert.match(styles, /@media\(min-width:480px\)/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(styles, /var\(--color-background\)/);
});

test("support hub prioritizes tracked requests and keeps one primary action", () => {
  assert.match(supportHub, /activeCount/);
  assert.match(supportHub, /data-status=\{item\.unread \? "unread" : item\.status\}/);
  assert.match(supportHub, /dateTime=\{item\.lastMessageAt\}/);
  assert.match(supportHub, /Prefer email\?/);
  assert.match(styles, /\.requestsCard\{order:-1\}/);
  assert.match(styles, /\.heroEmail/);
});
