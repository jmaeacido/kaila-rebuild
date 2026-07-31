import assert from "node:assert/strict";
import test from "node:test";
import { feedbackForDomainEvent } from "./notification-feedback.ts";

test("turns durable notification events into visible feedback", () => {
  assert.deepEqual(feedbackForDomainEvent({
    eventId: "event-1", type: "notification.created", occurredAt: new Date().toISOString(),
    resourceType: "notification", resourceId: "notification-1", version: 1,
    data: { notification: { title: "New offer", body: "A provider sent an offer." } },
  }), { title: "New offer", body: "A provider sent an offer.", href: "/notifications" });
});

test("ignores internal realtime events", () => {
  assert.equal(feedbackForDomainEvent({
    eventId: "event-2", type: "job.updated", occurredAt: new Date().toISOString(),
    resourceType: "service_job", resourceId: "job-1", version: 2, data: {},
  }), null);
});
