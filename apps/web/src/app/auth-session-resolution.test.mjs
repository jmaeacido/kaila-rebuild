import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const authClient = readFileSync(new URL("./auth-client.ts", import.meta.url), "utf8");
const authGuard = readFileSync(new URL("./auth-guard.tsx", import.meta.url), "utf8");
const login = readFileSync(new URL("./login/page.tsx", import.meta.url), "utf8");
const initialUiGate = readFileSync(new URL("./initial-ui-gate.tsx", import.meta.url), "utf8");

test("session requests have a shared finite timeout", () => {
  assert.match(authClient, /SESSION_REQUEST_TIMEOUT_MS = 8_000/);
  assert.match(authGuard, /fetchWithTimeout\("\/api\/v1\/me"/);
  assert.match(login, /fetchWithTimeout\("\/api\/v1\/auth\/session-status"/);
});

test("invalid sessions are cleared and protected routes expose recovery", () => {
  assert.match(authGuard, /response\.status !== 401 && response\.status !== 419/);
  assert.match(authGuard, /clearSession\(\)\.catch/);
  assert.match(authGuard, /sessionState === "error"/);
  assert.match(authGuard, /Try again/);
  assert.match(authGuard, /Sign in/);
  assert.match(login, /!body\.data\.authenticated[\s\S]*clearSession\(\)/);
});

test("authenticated content publishes a deterministic ready signal", () => {
  assert.match(initialUiGate, /data-kaila-app-ready=\{ready \? "true" : "false"\}/);
});
