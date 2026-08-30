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
  assert.match(source, /<ServiceCategoryMultiSelect/);
  assert.match(source, /useRealtimeInvalidation/);
  assert.match(source, /profile\.updated/);
});

test("Provider profile does not overwrite edits during background refreshes", () => {
  assert.match(source, /const formIsDirty = useRef\(false\)/);
  assert.match(source, /const loadSequence = useRef\(0\)/);
  assert.match(source, /provider && !formIsDirty\.current && sequence === loadSequence\.current/);
  assert.match(source, /onInput=\{markFormDirty\}/);
  assert.match(source, /markFormDirty\(\);\s*setServiceIds\(values\)/);
  assert.match(source, /setMessage\("saving"\);\s*loadSequence\.current \+= 1/);
  assert.match(source, /formIsDirty\.current = false/);
});

test("Provider profile loads and submits every offered service", () => {
  assert.match(source, /provider\.services\?\.map\(\(service\) => String\(service\.id\)\)/);
  assert.match(source, /serviceIds\.length === 0/);
  assert.match(source, /serviceIds: serviceIds\.map\(Number\)/);
  assert.doesNotMatch(source, /provider\.services\?\.\[0\]/);
});

test("Area mismatch banner reads provider service areas from API shape", () => {
  assert.match(bannerSource, /service_areas/);
  assert.doesNotMatch(bannerSource, /serviceAreas/);
});
