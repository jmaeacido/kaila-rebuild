import assert from "node:assert/strict";
import test from "node:test";
import { feedbackForDomainEvent } from "./notification-feedback.ts";

test("turns durable notification events into visible feedback", () => {
  assert.deepEqual(feedbackForDomainEvent({
    eventId: "event-1", type: "notification.created", occurredAt: new Date().toISOString(),
    resourceType: "notification", resourceId: "notification-1", version: 1,
    data: { notification: { id: "notification-1", type: "offer.created", title: "New offer", body: "A provider sent an offer.", resourceType: "service_job", resourceId: "job-1", data: { jobId: "job-1", type: "offer" }, readAt: null, createdAt: new Date().toISOString() } },
  }), { title: "New offer", body: "A provider sent an offer.", href: "/jobs/job-1/offers" });
});

test("turns every realtime domain event into visible feedback", () => {
  assert.deepEqual(feedbackForDomainEvent({
    eventId: "event-2", type: "job.state.changed", occurredAt: new Date().toISOString(),
    resourceType: "service_job", resourceId: "job-1", version: 2,
    data: { jobId: "job-1" },
  }), { title: "Job State Changed", body: "This update is now reflected in your job.", href: "/jobs/job-1" });
});

test("shows internal realtime events without inventing a route", () => {
  assert.deepEqual(feedbackForDomainEvent({
    eventId: "event-2", type: "job.updated", occurredAt: new Date().toISOString(),
    resourceType: "service_job", resourceId: "job-1", version: 2, data: {},
  }), { title: "Job Updated", body: "This update is now reflected in your job.", href: undefined });
});
