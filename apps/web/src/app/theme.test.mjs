import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isThemePreference,
  readStoredThemePreference,
  resolveTheme,
  themeBootstrapScript,
} from "./theme.ts";

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

test("public browsing defaults to light without a stored preference", () => {
  assert.equal(readStoredThemePreference(), "light");
  assert.match(themeBootstrapScript, /\? stored : "light"/);
});

test("theme hydration starts from a deterministic snapshot before browser reconciliation", () => {
  const provider = readFileSync(new URL("./theme-provider.tsx", import.meta.url), "utf8");

  assert.match(provider, /useState<ThemePreference>\("light"\)/);
  assert.match(provider, /useState<ResolvedTheme>\("light"\)/);
  assert.match(provider, /setTimeout\(\(\) => \{\s*commit\(readStoredThemePreference\(\)\)/);
  assert.doesNotMatch(provider, /useState<ThemePreference>\(\(\) => readStoredThemePreference\(\)\)/);
});
