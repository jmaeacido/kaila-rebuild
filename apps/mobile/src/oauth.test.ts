import { describe, expect, it } from "vitest";
import { validSocialAuthVerifier } from "./oauth";

const verifier = "A".repeat(43);
const now = 1_000_000;

describe("mobile social authentication state", () => {
  it("accepts a current PKCE verifier after an Android activity restart", () => {
    expect(validSocialAuthVerifier(JSON.stringify({
      verifier,
      createdAt: now - 60_000,
    }), now)).toBe(verifier);
  });

  it("rejects expired, malformed, and future verifier state", () => {
    expect(validSocialAuthVerifier(JSON.stringify({
      verifier,
      createdAt: now - 10 * 60 * 1000 - 1,
    }), now)).toBeNull();
    expect(validSocialAuthVerifier(JSON.stringify({
      verifier: "too-short",
      createdAt: now,
    }), now)).toBeNull();
    expect(validSocialAuthVerifier(JSON.stringify({
      verifier,
      createdAt: now + 1,
    }), now)).toBeNull();
    expect(validSocialAuthVerifier("not-json", now)).toBeNull();
  });
});
