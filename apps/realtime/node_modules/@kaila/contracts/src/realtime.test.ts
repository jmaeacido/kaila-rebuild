import { describe, expect, it } from "vitest";

import { realtimeEventEnvelopeSchema } from "./realtime.js";

describe("realtime event envelope", () => {
  it("rejects an invalid event identifier", () => {
    const result = realtimeEventEnvelopeSchema.safeParse({
      eventId: "client-selected-id",
      occurredAt: "2026-07-16T00:00:00Z",
      resourceType: "job",
      resourceId: "job-1",
      version: 1,
      data: {},
    });

    expect(result.success).toBe(false);
  });
});
