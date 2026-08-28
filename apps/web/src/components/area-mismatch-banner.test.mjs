import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const banner = await readFile(new URL("./area-mismatch-banner.tsx", import.meta.url), "utf8");
const account = await readFile(new URL("../app/account/page.tsx", import.meta.url), "utf8");

test("area warning reevaluates immediately after a home-area save", () => {
  assert.match(banner, /export const areaProfileChangedEvent/);
  assert.match(banner, /window\.addEventListener\(areaProfileChangedEvent, reevaluate\)/);
  assert.match(banner, /setWarning\(null\)/);
  assert.match(account, /window\.dispatchEvent\(new Event\(areaProfileChangedEvent\)\)/);
});

test("a newer area evaluation cannot be overwritten by a stale request", () => {
  assert.match(banner, /const currentEvaluation = \+\+evaluation/);
  assert.match(banner, /currentEvaluation !== evaluation/);
  assert.match(banner, /evaluation \+= 1/);
});
