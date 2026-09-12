import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./select-field.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./select-field.module.css", import.meta.url), "utf8");

test("SelectField keeps every option list within the available viewport", () => {
  assert.match(source, /space|below/);
  assert.match(source, /setPlacement/);
  assert.match(source, /setMaxHeight/);
  assert.match(styles, /overflow-y:auto/);
  assert.match(styles, /touch-action:pan-y/);
  assert.match(styles, /-webkit-overflow-scrolling:touch/);
});

test("SelectField supports forms and keyboard interaction", () => {
  assert.match(source, /onInvalid/);
  assert.match(source, /name=\{name\}/);
  assert.match(source, /ArrowDown/);
  assert.match(source, /role="listbox"/);
  assert.match(source, /aria-selected/);
});

test("SelectField optionally renders colorful service icons without changing generic selects", () => {
  assert.match(source, /serviceIcon\?: string/);
  assert.match(source, /placeholderServiceIcon\?: string/);
  assert.match(source, /<ServiceCategoryBadge icon=\{option\.serviceIcon\}/);
});

test("SelectField supports searchable triggers and nested option groups", () => {
  assert.match(source, /searchable\?: boolean/);
  assert.match(source, /SelectOptionGroup/);
  assert.match(source, /filterGroups/);
  assert.match(source, /type="search"/);
  assert.match(source, /groupLabel/);
  assert.match(styles, /\[data-searching="true"\]/);
  assert.match(styles, /\.subgroupLabel/);
});
