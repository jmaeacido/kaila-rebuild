import { describe, expect, it } from "vitest";
import { callStatusEndsMedia } from "./call-status";

describe("callStatusEndsMedia", () => {
  it("keeps newly answered calls alive", () => {
    expect(callStatusEndsMedia("active")).toBe(false);
    expect(callStatusEndsMedia("ringing")).toBe(false);
  });

  it("closes only terminal call states", () => {
    expect(callStatusEndsMedia("declined")).toBe(true);
    expect(callStatusEndsMedia("ended")).toBe(true);
  });
});
