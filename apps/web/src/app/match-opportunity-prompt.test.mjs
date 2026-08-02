import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { formatMatchBudget } from "./match-opportunity-budget.ts";

const source = readFileSync(new URL("./match-opportunity-prompt.tsx", import.meta.url), "utf8");
const runtime = readFileSync(new URL("./notification-runtime.tsx", import.meta.url), "utf8");

test("match budget formats open and peso ranges", () => {
  assert.equal(formatMatchBudget(null, null), "Open to offers");
  assert.equal(formatMatchBudget(150000, 250000), "₱1,500 – ₱2,500");
});

test("match prompt reconciles opportunity avatar, route metrics, and budget", () => {
  assert.match(source, /OpportunityRouteMetrics/);
  assert.match(source, /formatMatchBudget/);
  assert.match(source, /client\.avatarUrl/);
  assert.match(runtime, /matchJobId/);
  assert.match(runtime, /appToastAvatar/);
});
