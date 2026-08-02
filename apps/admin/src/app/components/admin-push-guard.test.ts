import { beforeEach, describe, expect, it, vi } from "vitest";

const isPluginAvailable = vi.fn();
const isMessagingAvailable = vi.fn();

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => "android",
    isPluginAvailable: (name: string) => isPluginAvailable(name),
  },
  registerPlugin: () => ({
    isMessagingAvailable: () => isMessagingAvailable(),
  }),
}));

describe("adminPushMessagingAvailable", () => {
  beforeEach(() => {
    vi.resetModules();
    isPluginAvailable.mockReset();
    isMessagingAvailable.mockReset();
  });

  it("refuses registration on APKs that lack the native Firebase probe", async () => {
    isPluginAvailable.mockReturnValue(false);
    const { adminPushMessagingAvailable } = await import("./admin-push-guard");
    await expect(adminPushMessagingAvailable()).resolves.toBe(false);
    expect(isMessagingAvailable).not.toHaveBeenCalled();
  });

  it("refuses registration when Firebase Messaging is unavailable", async () => {
    isPluginAvailable.mockReturnValue(true);
    isMessagingAvailable.mockResolvedValue({ available: false, reason: "IllegalStateException" });
    const { adminPushMessagingAvailable } = await import("./admin-push-guard");
    await expect(adminPushMessagingAvailable()).resolves.toBe(false);
  });

  it("allows registration when the native probe succeeds", async () => {
    isPluginAvailable.mockReturnValue(true);
    isMessagingAvailable.mockResolvedValue({ available: true });
    const { adminPushMessagingAvailable } = await import("./admin-push-guard");
    await expect(adminPushMessagingAvailable()).resolves.toBe(true);
  });
});
