import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const authGuard = readFileSync(new URL("./auth-guard.tsx", import.meta.url), "utf8");
const callProvider = readFileSync(new URL("./calls/call-provider.tsx", import.meta.url), "utf8");

test("CallProvider remains mounted while a protected route authenticates", () => {
  const provider = authGuard.indexOf("<CallProvider>");
  const sessionGate = authGuard.indexOf("allowedPath !== pathname ?", provider);
  assert.ok(provider >= 0);
  assert.ok(sessionGate > provider);
  assert.doesNotMatch(authGuard.slice(0, provider), /allowedPath !== pathname[\s\S]*?return/);
});

test("native answer can read incoming call state without waiting for a React effect", () => {
  assert.match(callProvider, /callRef\.current = incoming;[\s\S]*?setCall\(incoming\);/);
  assert.match(callProvider, /if \(callRef\.current\) return;/);
});
