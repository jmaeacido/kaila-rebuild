import assert from "node:assert/strict";
import test from "node:test";
import { isThemePreference, resolveTheme } from "./theme.ts";

test("accepts only light, dark, and system preferences", () => {
  assert.equal(isThemePreference("light"), true);
  assert.equal(isThemePreference("dark"), true);
  assert.equal(isThemePreference("system"), true);
  assert.equal(isThemePreference("neon"), false);
  assert.equal(isThemePreference(null), false);
});

test("resolves forced themes without consulting the OS", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("resolves system from the provided OS flag", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
});
