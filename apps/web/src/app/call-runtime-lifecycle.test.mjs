import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const authGuard = readFileSync(new URL("./auth-guard.tsx", import.meta.url), "utf8");
const callProvider = readFileSync(new URL("./calls/call-provider.tsx", import.meta.url), "utf8");
const realtimeProvider = readFileSync(new URL("./realtime-provider.tsx", import.meta.url), "utf8");

test("CallProvider remains mounted while a protected route authenticates", () => {
  const provider = authGuard.indexOf("<CallProvider>");
  const sessionGate = authGuard.indexOf("{sessionReady ? (", provider);
  assert.ok(provider >= 0);
  assert.ok(sessionGate > provider);
  assert.match(authGuard.slice(sessionGate), /<BrandedLoader label="Getting KAILA ready for you/);
});

test("native answer can read incoming call state without waiting for a React effect", () => {
  assert.match(callProvider, /callRef\.current = incoming;[\s\S]*?setCall\(incoming\);/);
  assert.match(callProvider, /if \(callRef\.current\) return;/);
});

test("call signal polling never overlaps requests", () => {
  assert.doesNotMatch(callProvider, /setInterval\(\(\) => void poll\(\)/);
  assert.match(callProvider, /finally \{[\s\S]*?setTimeout\(\(\) => void poll\(\), 750\)/);
});

test("logout tears down authenticated activity without a final realtime refresh", () => {
  assert.match(authGuard, /if \(loggingOut\) \{\s*return <BrandedLoader/);
  assert.match(authGuard, /CustomEvent<boolean>\(realtimeAuthChangedName, \{ detail: false \}\)/);
  assert.match(callProvider, /pollCallSignals\(pollAbort\.signal\)/);
  assert.match(callProvider, /pollAbort\.abort\(\)/);
  assert.match(realtimeProvider, /detail === false[\s\S]*?publishStatus\("disconnected"\);[\s\S]*?return;/);
});
