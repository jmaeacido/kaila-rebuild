import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const opportunity = readFileSync(new URL("./opportunities/[jobId]/page.tsx", import.meta.url), "utf8");
const compare = readFileSync(new URL("./jobs/[jobId]/offers/page.tsx", import.meta.url), "utf8");
const form = readFileSync(new URL("../components/offer-terms-form.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./offers.module.css", import.meta.url), "utf8");

test("provider offers open in a quick modal instead of a long inline form", () => {
  assert.match(opportunity, /<ActionModal/);
  assert.match(opportunity, /OfferTermsForm/);
  assert.match(opportunity, /setOfferOpen\(true\)/);
  assert.match(opportunity, /offerDock/);
  assert.doesNotMatch(opportunity, /What’s included\? <span>Optional<\/span>/);
});

test("clients can counteroffer from the compare page modal", () => {
  assert.match(compare, /<ActionModal/);
  assert.match(compare, /Send counteroffer/);
  assert.match(compare, /\/api\/v1\/offers\/\$\{counterOffer\.id\}\/revisions/);
});

test("quick offer requires only price and availability by default", () => {
  assert.match(form, /Your price \(₱\)/);
  assert.match(form, /When can you start\?/);
  assert.match(form, /Add optional details/);
  assert.match(form, /showExtras/);
  assert.match(styles, /\.offerDock\{/);
});
