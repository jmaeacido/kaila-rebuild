import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";

describe("realtime configuration", () => {
  it("rejects a missing ticket verification key", () => {
    expect(() =>
      loadConfig({
        KAILA_API_ORIGIN: "https://api.example.test",
        REDIS_URL: "redis://127.0.0.1:6379",
      }),
    ).toThrow();
  });

  it("uses safe local listener defaults", () => {
    const config = loadConfig({
      KAILA_API_ORIGIN: "https://api.example.test",
      REALTIME_TICKET_PUBLIC_KEY_PEM: "test-public-key",
      REDIS_URL: "redis://127.0.0.1:6379",
    });

    expect(config.HOST).toBe("127.0.0.1");
    expect(config.PORT).toBe(3100);
    expect(config.allowedOrigins).toEqual(["https://api.example.test"]);
  });

  it("accepts only configured browser origins", () => {
    const config = loadConfig({
      KAILA_API_ORIGIN: "https://api.example.test",
      KAILA_ALLOWED_ORIGINS:
        "https://kaila-app.com, https://app.kaila-app.com",
      REALTIME_TICKET_PUBLIC_KEY_PEM: "test-public-key",
      REDIS_URL: "redis://127.0.0.1:6379",
    });

    expect(config.allowedOrigins).toEqual([
      "https://kaila-app.com",
      "https://app.kaila-app.com",
    ]);
    expect(() =>
      loadConfig({
        KAILA_API_ORIGIN: "https://api.example.test",
        KAILA_ALLOWED_ORIGINS: "not-an-origin",
        REALTIME_TICKET_PUBLIC_KEY_PEM: "test-public-key",
        REDIS_URL: "redis://127.0.0.1:6379",
      }),
    ).toThrow();
  });
});
