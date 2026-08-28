import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const bannerSource = readFileSync(new URL("../../components/area-mismatch-banner.tsx", import.meta.url), "utf8");

test("Provider profile loads saved data from marketplace profile", () => {
  assert.match(source, /\/api\/v1\/me\/marketplace-profile/);
  assert.match(source, /provider\.display_name/);
  assert.match(source, /provider\.service_areas/);
  assert.match(source, /value=\{displayName\}/);
  assert.match(source, /value=\{bio\}/);
  assert.match(source, /<CategorySelect/);
});

test("Area mismatch banner reads provider service areas from API shape", () => {
  assert.match(bannerSource, /service_areas/);
  assert.doesNotMatch(bannerSource, /serviceAreas/);
});
