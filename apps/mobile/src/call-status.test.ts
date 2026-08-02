import { describe, expect, it } from "vitest";
import { callStatusEndsMedia, callUpdateDismissesRinging, nativeCallUpdateEndsMedia } from "./call-status";

describe("callStatusEndsMedia", () => {
  it("keeps newly answered calls alive", () => {
    expect(callStatusEndsMedia("active")).toBe(false);
    expect(callStatusEndsMedia("ringing")).toBe(false);
  });

  it("closes only terminal call states", () => {
    expect(callStatusEndsMedia("declined")).toBe(true);
    expect(callStatusEndsMedia("ended")).toBe(true);
  });

  it("does not end an answered call when an older push mislabeled it as cancel", () => {
    expect(nativeCallUpdateEndsMedia("cancel", "active")).toBe(false);
    expect(callUpdateDismissesRinging("cancel", "active")).toBe(true);
  });

  it("ends media for actual terminal updates", () => {
    expect(nativeCallUpdateEndsMedia("cancel", "ended")).toBe(true);
    expect(nativeCallUpdateEndsMedia("cancel", undefined)).toBe(true);
  });
});
