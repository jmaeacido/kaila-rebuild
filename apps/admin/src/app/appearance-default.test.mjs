import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layout = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
const switcher = readFileSync(
  new URL("./components/appearance-switcher.tsx", import.meta.url),
  "utf8",
);
const statusTheme = readFileSync(
  new URL("../../public/status/theme.js", import.meta.url),
  "utf8",
);

test("admin entry points default to light without a stored preference", () => {
  assert.match(layout, /\? stored : "light"/);
  assert.match(layout, /dataset\.appearance = "light"/);
  assert.match(switcher, /isAppearanceTheme\(stored\) \? stored : "light"/);
  assert.match(statusTheme, /\? stored\s+: "light"/);
});

test("admin entry points preserve explicit system appearance", () => {
  assert.match(layout, /preference === "system"/);
  assert.match(switcher, /getItem\(storageKey\) === "system"/);
  assert.match(statusTheme, /preference === "system"/);
});
