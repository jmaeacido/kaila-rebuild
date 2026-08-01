import assert from "node:assert/strict";
import test from "node:test";
import { feedbackForDomainEvent } from "./notification-feedback.ts";
import { readFileSync } from "node:fs";

const globals = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const runtime = readFileSync(new URL("./notification-runtime.tsx", import.meta.url), "utf8");
const realtime = readFileSync(new URL("./realtime-provider.tsx", import.meta.url), "utf8");
const invalidation = readFileSync(new URL("./use-realtime-invalidation.ts", import.meta.url), "utf8");

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

test("mobile notifications are viewport bounded and independently scrollable", () => {
  assert.match(globals, /\.notificationDropdown \{ position: fixed; inset-inline: var\(--spacing-12\)/);
  assert.match(globals, /grid-template-rows: auto minmax\(0, 1fr\) auto/);
  assert.match(globals, /\.notificationDropdownList \{ max-height: none; min-height: 0/);
});

test("realtime feedback advances a bounded non-blocking queue", () => {
  assert.match(runtime, /eventKey: detail\.eventId/);
  assert.match(runtime, /dismiss\(active\.id\), 6_000/);
  assert.match(runtime, /current\.slice\(-19\)/);
  assert.match(runtime, /aria-modal="false"/);
});

test("realtime starts with resilient polling and reconciles visible screens", () => {
  assert.match(realtime, /transports: \["polling", "websocket"\]/);
  assert.match(invalidation, /document\.visibilityState === "visible" && !realtimeConnected/);
  assert.match(invalidation, /10_000/);
});
