import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("./page.module.css", import.meta.url), "utf8");
const page = readFileSync(new URL("./landing-page.tsx", import.meta.url), "utf8");

test("the signed-out landing header clears the Android status bar", () => {
  const topbar = styles.match(/\.topbar\s*\{(?<rules>[\s\S]*?)\}/)?.groups?.rules ?? "";

  assert.match(topbar, /min-height:\s*calc\(var\(--spacing-64\) \+ env\(safe-area-inset-top\)\)/);
  assert.match(topbar, /padding:\s*calc\(var\(--spacing-8\) \+ env\(safe-area-inset-top\)\)/);
});

test("the mobile public header exposes login without crowding it with theme controls", () => {
  assert.match(page, /className=\{styles\.providerLink\} href="\/login"[\s\S]*?Log in/);
  assert.match(page, /<ThemeToggle className=\{styles\.headerTheme\} \/>/);
  assert.match(styles, /\.providerLink\s*\{[\s\S]*?display:\s*inline-flex;/);
  assert.match(styles, /\.headerTheme\s*\{\s*display:\s*none;/);
  assert.match(styles, /@media \(min-width: 40rem\)[\s\S]*?\.headerTheme\s*\{\s*display:\s*block;/);
});
