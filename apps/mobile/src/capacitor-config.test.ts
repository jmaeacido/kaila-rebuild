import { describe, expect, it } from "vitest";

import config from "../capacitor.config";

describe("consumer Android configuration", () => {
  it("uses the secure production consumer origin", () => {
    expect(config.appId).toBe("com.kaila.marketplace");
    expect(config.appName).toBe("KAILA");
    expect(config.server?.url).toBe("https://app.kaila-app.com");
    expect(config.server?.cleartext).toBe(false);
    expect(config.server?.allowNavigation).toEqual(["app.kaila-app.com"]);
  });
});
