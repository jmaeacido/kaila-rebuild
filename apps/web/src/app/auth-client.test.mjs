import assert from "node:assert/strict";
import test from "node:test";
import { signedInHome } from "./auth-client.ts";

test("all authenticated marketplace modes share the Home destination", () => {
  assert.equal(
    signedInHome({ activeMode: "client", providerEligible: false }),
    "/home",
  );
  assert.equal(
    signedInHome({ activeMode: "provider", providerEligible: true }),
    "/home",
  );
  assert.equal(
    signedInHome({ activeMode: null, providerEligible: false }),
    "/home",
  );
});
