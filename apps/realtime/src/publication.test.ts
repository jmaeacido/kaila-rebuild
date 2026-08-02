import { describe, expect, it } from "vitest";

import { parseRealtimePublication } from "./publication.js";

describe("realtime outbox publications", () => {
  it("accepts a bounded server-routed publication", () => {
    const publication = parseRealtimePublication(
      JSON.stringify({
        event: {
          eventId: "123e4567-e89b-12d3-a456-426614174000",
          type: "job.updated",
          occurredAt: "2026-07-16T05:00:00+00:00",
          resourceType: "job",
          resourceId: "job-1",
          version: 1,
          data: { status: "open" },
        },
        recipientUserIds: ["42"],
      }),
    );

    expect(publication && "recipientUserIds" in publication ? publication.recipientUserIds : null).toEqual(["42"]);
    expect(publication?.event.data).toEqual({ status: "open" });
  });

  it("accepts authenticated broadcast publications", () => {
    const publication = parseRealtimePublication(
      JSON.stringify({
        event: {
          eventId: "123e4567-e89b-12d3-a456-426614174000",
          type: "platform.maintenance.scheduled",
          occurredAt: "2026-07-16T05:00:00+00:00",
          resourceType: "platform_maintenance",
          resourceId: "1",
          version: 1,
          data: { phase: "scheduled" },
        },
        broadcast: "authenticated",
      }),
    );

    expect(publication && "broadcast" in publication ? publication.broadcast : null).toBe("authenticated");
  });

  it("rejects malformed JSON and publications without server audiences", () => {
    expect(parseRealtimePublication("not-json")).toBeNull();
    expect(parseRealtimePublication(JSON.stringify({ event: {} }))).toBeNull();
  });
});
