import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./category-select.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./category-select.module.css", import.meta.url), "utf8");

test("CategorySelect keeps options scrollable within the viewport", () => {
  assert.match(styles, /overflow-y:\s*auto/);
  assert.match(styles, /overscroll-behavior:\s*contain/);
  assert.match(source, /data-placement/);
  assert.match(source, /setMaxHeight/);
});
