import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const floating = readFileSync(new URL("../components/floating-katabang.tsx", import.meta.url), "utf8");
const floatingStyles = readFileSync(new URL("../components/floating-katabang.module.css", import.meta.url), "utf8");
const fullPage = readFileSync(new URL("./help/katabang/page.tsx", import.meta.url), "utf8");

for (const [surface, source] of [["floating assistant", floating], ["full page", fullPage]]) {
  test(`${surface} renders a submitted question while Katabang is thinking`, () => {
    assert.match(source, /setPendingQuestion\(question\)/);
    assert.match(source, /You asked: \{pendingQuestion\}|className=\{styles\.question\}>\{pendingQuestion\}/);
    assert.match(source, /Katabang is thinking…/);
    assert.match(source, /setPendingQuestion\(null\)/);
  });

  test(`${surface} preserves failed questions and provides retry`, () => {
    assert.doesNotMatch(source, /catch\s*\{\s*setMessage\(question\)/);
    assert.match(source, /sendQuestion\(pendingQuestion\)/);
    assert.match(source, /Try again/);
  });
}

test("floating thinking feedback respects reduced motion", () => {
  assert.match(floatingStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(floatingStyles, /thinking-pulse/);
});
