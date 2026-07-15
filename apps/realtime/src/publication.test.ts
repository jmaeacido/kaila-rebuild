import { describe, expect, it } from "vitest";

import { parseRealtimePublication } from "./publication.js";

describe("realtime outbox publications", () => {
  it("accepts a bounded server-routed publication", () => {
    const publication = parseRealtimePublication(
      JSON.stringify({
        event: {
          eventId: "123e4567-e89b-12d3-a456-426614174000",
          occurredAt: "2026-07-16T05:00:00+00:00",
          resourceType: "job",
          resourceId: "job-1",
          version: 1,
          data: { status: "open" },
        },
        recipientUserIds: ["42"],
      }),
    );

    expect(publication?.recipientUserIds).toEqual(["42"]);
    expect(publication?.event.data).toEqual({ status: "open" });
  });

  it("rejects malformed JSON and publications without server audiences", () => {
    expect(parseRealtimePublication("not-json")).toBeNull();
    expect(parseRealtimePublication(JSON.stringify({ event: {} }))).toBeNull();
  });
});
