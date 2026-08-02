import { describe, expect, it } from "vitest";
import { jobDraftInputSchema } from "./marketplace-jobs.js";

import { marketplaceRealtimeEventTypeSchema, realtimeEventEnvelopeSchema } from "./realtime.js";

describe("realtime event envelope", () => {
  it("rejects an invalid event identifier", () => {
    const result = realtimeEventEnvelopeSchema.safeParse({
      eventId: "client-selected-id",
      type: "job.updated",
      occurredAt: "2026-07-16T00:00:00Z",
      resourceType: "job",
      resourceId: "job-1",
      version: 1,
      data: {},
    });

    expect(result.success).toBe(false);
  });

  it("accepts the extended marketplace realtime event catalog", () => {
    for (const type of [
      "opportunity.updated",
      "message.reacted",
      "message.asset.updated",
      "offer.rejected",
      "notification.read",
      "support.case.created",
      "support.message.created",
    ] as const) {
      expect(marketplaceRealtimeEventTypeSchema.safeParse(type).success).toBe(true);
    }
  });
});

describe("job draft contract", () => {
  it("rejects an inverted budget and a scheduled job without a time", () => {
    const result = jobDraftInputSchema.safeParse({ title:"Repair", description:"A detailed repair request", categoryId:1, areaId:1, scheduleType:"scheduled", scheduledAt:null, budgetMinCentavos:20000, budgetMaxCentavos:10000, latitude:null, longitude:null, addressLabel:null });
    expect(result.success).toBe(false);
  });
});
