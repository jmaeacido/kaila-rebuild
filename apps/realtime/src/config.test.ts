import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";

describe("realtime configuration", () => {
  it("rejects a missing ticket verification key", () => {
    expect(() =>
      loadConfig({
        KAILA_API_ORIGIN: "https://api.example.test",
      }),
    ).toThrow();
  });

  it("uses safe local listener defaults", () => {
    const config = loadConfig({
      KAILA_API_ORIGIN: "https://api.example.test",
      REALTIME_TICKET_PUBLIC_KEY_PEM: "test-public-key",
    });

    expect(config.HOST).toBe("127.0.0.1");
    expect(config.PORT).toBe(3100);
  });
});
