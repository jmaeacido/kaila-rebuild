import { describe, expect, it } from "vitest";

import config from "../capacitor.config";

describe("admin Android configuration", () => {
  it("uses a distinct package and the secure production admin origin", () => {
    expect(config.appId).toBe("com.kaila.admin");
    expect(config.appName).toBe("KAILA Admin");
    expect(config.server?.url).toBe("https://admin.kaila-app.com");
    expect(config.server?.cleartext).toBe(false);
    expect(config.server?.allowNavigation).toEqual(["admin.kaila-app.com"]);
  });
});
