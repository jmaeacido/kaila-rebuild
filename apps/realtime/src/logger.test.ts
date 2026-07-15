import { describe, expect, it } from "vitest";

import { structuredLog } from "./logger.js";

describe("structured realtime logging", () => {
  it("redacts credentials and precise location recursively", () => {
    const log = JSON.parse(
      structuredLog("info", "test", {
        connectionId: "safe-id",
        token: "secret",
        nested: { coordinates: [14.5, 121] },
      }),
    );

    expect(log.connectionId).toBe("safe-id");
    expect(log.token).toBe("[REDACTED]");
    expect(log.nested.coordinates).toBe("[REDACTED]");
  });
});
