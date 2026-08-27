import assert from "node:assert/strict";
import test from "node:test";
import { feedbackForDomainEvent, isEphemeralRealtimeEvent } from "./notification-feedback.ts";
import { notificationRoute } from "./notification-route.ts";
import { readFileSync } from "node:fs";

const globals = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const runtime = readFileSync(new URL("./notification-runtime.tsx", import.meta.url), "utf8");
const realtime = readFileSync(new URL("./realtime-provider.tsx", import.meta.url), "utf8");
const invalidation = readFileSync(new URL("./use-realtime-invalidation.ts", import.meta.url), "utf8");
const home = readFileSync(new URL("./home/page.tsx", import.meta.url), "utf8");

test("profile review notifications return users to their account", () => {
  assert.equal(notificationRoute({
    id: "notification-profile",
    type: "profile.file_approved",
    title: "Profile picture approved",
    body: "Your profile picture is now available on KAILA.",
    resourceType: "profile_asset",
    resourceId: "asset-1",
    data: { type: "profile", reviewStatus: "approved" },
    readAt: null,
    createdAt: new Date().toISOString(),
  }), "/account?profilePicture=review&reviewStatus=approved&notificationId=notification-profile");
});

test("rejected profile reviews deep-link to the profile-picture sheet", () => {
  assert.equal(notificationRoute({
    id: "notification-profile-rejected",
    type: "profile.file_rejected",
    title: "Profile picture not approved",
    body: "Choose another photo.",
    resourceType: "profile_asset",
    resourceId: "asset-2",
    data: { type: "profile", reviewStatus: "rejected" },
    readAt: null,
    createdAt: new Date().toISOString(),
  }), "/account?profilePicture=review&reviewStatus=rejected&notificationId=notification-profile-rejected");
});

test("turns durable notification events into visible feedback", () => {
  assert.deepEqual(feedbackForDomainEvent({
    eventId: "event-1", type: "notification.created", occurredAt: new Date().toISOString(),
    resourceType: "notification", resourceId: "notification-1", version: 1,
    data: { notification: { id: "notification-1", type: "offer.created", title: "New offer", body: "A provider sent an offer.", resourceType: "service_job", resourceId: "job-1", data: { jobId: "job-1", type: "offer" }, readAt: null, createdAt: new Date().toISOString() } },
  }), {
    title: "New offer",
    body: "A provider sent an offer.",
    href: "/jobs/job-1/offers",
    persistent: true,
    actionLabel: "View update",
    eyebrow: undefined,
    matchJobId: undefined,
  });
});

test("job matches use the shared non-blocking dialog copy", () => {
  assert.deepEqual(feedbackForDomainEvent({
    eventId: "event-match", type: "notification.created", occurredAt: new Date().toISOString(),
    resourceType: "notification", resourceId: "notification-2", version: 1,
    data: { notification: { id: "notification-2", type: "opportunity.matched", title: "New job near you", body: "Test", resourceType: "service_job", resourceId: "job-2", data: { jobId: "job-2", type: "job" }, readAt: null, createdAt: new Date().toISOString() } },
  }), {
    title: "Test",
    body: "New job near you",
    href: "/opportunities/job-2",
    persistent: true,
    actionLabel: "View job",
    eyebrow: "NEW MATCH NEAR YOU",
    matchJobId: "job-2",
  });
});

test("suppresses notification-backed domain events to avoid dual toasts", () => {
  assert.equal(feedbackForDomainEvent({
    eventId: "event-2", type: "job.state.changed", occurredAt: new Date().toISOString(),
    resourceType: "service_job", resourceId: "job-1", version: 2,
    data: { jobId: "job-1" },
  }), null);
});

test("suppresses silent domain events without inventing toast copy", () => {
  assert.equal(feedbackForDomainEvent({
    eventId: "event-2", type: "job.updated", occurredAt: new Date().toISOString(),
    resourceType: "service_job", resourceId: "job-1", version: 2, data: {},
  }), null);
});

test("suppresses call ringing feedback owned by CallProvider", () => {
  assert.equal(feedbackForDomainEvent({
    eventId: "event-call", type: "call.ringing", occurredAt: new Date().toISOString(),
    resourceType: "call_session", resourceId: "call-1", version: 1,
    data: { callId: "call-1", contextType: "job", contextId: "job-1", media: "audio" },
  }), null);
  assert.equal(feedbackForDomainEvent({
    eventId: "event-call-note", type: "notification.created", occurredAt: new Date().toISOString(),
    resourceType: "notification", resourceId: "notification-call", version: 1,
    data: { notification: { id: "notification-call", type: "call.ringing", title: "Incoming audio call", body: "Ada is calling about your job.", resourceType: "call_session", resourceId: "call-1", data: { type: "call", callId: "call-1" }, readAt: null, createdAt: new Date().toISOString() } },
  }), null);
});

test("suppresses high-frequency ephemeral realtime events", () => {
  assert.equal(isEphemeralRealtimeEvent("travel.location.changed"), true);
  assert.equal(isEphemeralRealtimeEvent("conversation.typing.changed"), true);
  assert.equal(feedbackForDomainEvent({
    eventId: "event-3", type: "travel.location.changed", occurredAt: new Date().toISOString(),
    resourceType: "travel_session", resourceId: "travel-1", version: 3, data: { jobId: "job-1" },
  }), null);
});

test("mobile notifications are viewport bounded and independently scrollable", () => {
  assert.match(globals, /\.notificationDropdown \{ position: fixed; inset-inline: var\(--spacing-12\)/);
  assert.match(globals, /max-height: calc\(var\(--kaila-viewport-height, 100dvh\)/);
  assert.match(globals, /\.notificationDropdownList \{ max-height: calc\([^}]+min-height: 0/);
  assert.match(globals, /notificationItemIcon/);
});

test("realtime feedback advances a bounded non-blocking queue", () => {
  assert.match(runtime, /eventKey: detail\.eventId/);
  assert.match(runtime, /dismiss\(active\.id\), 6_000/);
  assert.match(runtime, /next\.slice\(-19\)/);
  assert.match(runtime, /aria-modal="false"/);
  assert.match(runtime, /appToastDialog/);
  assert.match(runtime, /persistent/);
  assert.match(runtime, /MatchOpportunityPrompt/);
  assert.match(runtime, /MatchOpportunityDetails/);
  assert.match(globals, /\.appToastMatchMeta/);
});

test("realtime starts with resilient polling and reconciles visible screens", () => {
  assert.match(realtime, /transports: \["polling", "websocket"\]/);
  assert.match(realtime, /window\.location\.hostname}:3100/);
  assert.match(realtime, /PUBLIC_PATHS/);
  assert.match(realtime, /getRealtimeStatus/);
  assert.match(invalidation, /getRealtimeStatus\(\) === "connected"/);
  assert.match(invalidation, /document\.visibilityState === "visible" && !realtimeConnected/);
  assert.match(invalidation, /10_000/);
});

test("home reconciles quietly and ignores ephemeral travel or typing noise", () => {
  assert.match(home, /load\(true\)/);
  assert.match(home, /if \(!quiet\) setStatus\("loading"\)/);
  assert.match(home, /isEphemeralRealtimeEvent\(event\.type\)/);
  assert.match(home, /job_asset/);
  assert.doesNotMatch(home, /setPopupOpportunity/);
});
