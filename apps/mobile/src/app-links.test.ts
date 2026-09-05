import { beforeEach, describe, expect, it, vi } from "vitest";

const app = vi.hoisted(() => ({ addListener: vi.fn(), getLaunchUrl: vi.fn() }));
vi.mock("@capacitor/app", () => ({ App: app }));

describe("Android App Link lifecycle", () => {
  let listener: (event: { url: string }) => void;
  const remove = vi.fn();
  const options = { appHost: "app.kaila-app.com", navigate: vi.fn(), beforeNavigate: vi.fn() };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    app.addListener.mockImplementation(async (_name, callback) => {
      listener = callback;
      return { remove };
    });
    app.getLaunchUrl.mockResolvedValue(undefined);
  });

  it("opens a QR on cold start and consumes that launch only once", async () => {
    app.getLaunchUrl.mockResolvedValue({ url: "https://kaila-app.com/post-job" });
    const { initializeAppLinks } = await import("./app-links");
    const handle = await initializeAppLinks(options);
    expect(options.navigate).toHaveBeenCalledWith("/post-job");
    await handle.remove();
    await initializeAppLinks(options);
    expect(app.getLaunchUrl).toHaveBeenCalledTimes(1);
    expect(options.navigate).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("handles repeated scans while running and ignores unrelated hosts", async () => {
    const { initializeAppLinks } = await import("./app-links");
    await initializeAppLinks(options);
    listener({ url: "https://kaila-app.com/download" });
    listener({ url: "https://kaila-app.com/post-job" });
    listener({ url: "https://evil.example/post-job" });
    expect(options.navigate.mock.calls).toEqual([["/home"], ["/post-job"]]);
    expect(options.beforeNavigate).toHaveBeenCalledTimes(2);
  });

  it("keeps a newer live scan when the cold-start lookup resolves late", async () => {
    let resolveLaunch!: (value: { url: string }) => void;
    app.getLaunchUrl.mockImplementation(() => new Promise((resolve) => { resolveLaunch = resolve; }));
    const { initializeAppLinks } = await import("./app-links");
    const initialization = initializeAppLinks(options);
    await vi.waitFor(() => expect(app.getLaunchUrl).toHaveBeenCalled());
    listener({ url: "https://kaila-app.com/post-job" });
    resolveLaunch({ url: "https://kaila-app.com/download" });
    await initialization;
    expect(options.navigate.mock.calls).toEqual([["/post-job"]]);
  });

  it("keeps live links working if launch lookup fails", async () => {
    app.getLaunchUrl.mockRejectedValue(new Error("Unavailable"));
    const { initializeAppLinks } = await import("./app-links");
    await initializeAppLinks(options);
    listener({ url: "kaila://app/login?socialCode=test" });
    expect(options.navigate).toHaveBeenCalledWith("/login?socialCode=test");
  });
});
