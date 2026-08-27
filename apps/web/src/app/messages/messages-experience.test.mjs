import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inbox = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const chat = readFileSync(new URL("./[conversationId]/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./messages.module.css", import.meta.url), "utf8");

test("Messages clearly limits the inbox to accepted job conversations", () => {
  assert.match(inbox, /Messaging is for accepted jobs/);
  assert.match(inbox, /once a client hires a provider/);
  assert.match(inbox, /\/api\/v1\/job-conversations/);
  assert.match(inbox, /\/jobs\/\$\{item\.jobId\}\/hired\/conversation/);
  assert.match(inbox, /lastMessage\.body/);
  assert.doesNotMatch(inbox, /direct-conversations|New message|message request/i);
});

test("Legacy direct-conversation routes return to the accepted-job inbox", () => {
  assert.match(chat, /redirect\("\/messages"\)/);
});

test("Messages supports touch navigation, dark-mode tokens, and reduced motion", () => {
  assert.match(styles, /min-height:var\(--control-min-height\)/);
  assert.match(styles, /var\(--color-background\)/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
});
