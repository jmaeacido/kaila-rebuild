import assert from "node:assert/strict";
import test from "node:test";
import {
  identityGateCopy,
  identityGateReasonFromMessage,
  isIdentityVerificationBlock,
} from "./identity-verification-gate.ts";

test("detects identity verification API blockers", () => {
  assert.equal(isIdentityVerificationBlock("Verify your identity before posting your first job."), true);
  assert.equal(isIdentityVerificationBlock("Verify your identity before activating provider mode."), true);
  assert.equal(isIdentityVerificationBlock("Check your connection and try again."), false);
});

test("maps blocker copy to the correct gate reason", () => {
  assert.equal(identityGateReasonFromMessage("Verify your identity before posting your first job."), "post_job");
  assert.equal(identityGateReasonFromMessage("Verify your identity before activating provider mode."), "activate_provider");
  assert.equal(identityGateCopy("post_job").title, "Verify your identity to post your first job");
  assert.equal(identityGateCopy("activate_provider").title, "Verify your identity to become a provider");
});
