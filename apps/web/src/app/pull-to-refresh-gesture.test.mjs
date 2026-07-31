import assert from "node:assert/strict";
import test from "node:test";

import {
  pullDistance,
  pullRefreshMaximum,
  pullRefreshThreshold,
  shouldRefresh,
} from "./pull-to-refresh-gesture.ts";

test("ignores upward movement and damps downward movement", () => {
  assert.equal(pullDistance(100, 80), 0);
  assert.ok(Math.abs(pullDistance(100, 200) - 55) < Number.EPSILON * 100);
});

test("caps the visible pull distance", () => {
  assert.equal(pullDistance(0, 1000), pullRefreshMaximum);
});

test("refreshes only after the release threshold", () => {
  assert.equal(shouldRefresh(pullRefreshThreshold - 1), false);
  assert.equal(shouldRefresh(pullRefreshThreshold), true);
});
