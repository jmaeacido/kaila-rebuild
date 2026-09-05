import { deepLinkRoute, incomingCallRoute, notificationRoute } from "./routes";
import { describe, expect, it } from "vitest";

describe("mobile routing", () => {
  it("routes only trusted deep links", () => {
    expect(deepLinkRoute("https://app.kaila-app.com/jobs/abc/work", "app.kaila-app.com")).toBe("/jobs/abc/work");
    expect(deepLinkRoute("https://evil.example/jobs/abc/work", "app.kaila-app.com")).toBeNull();
    expect(deepLinkRoute("javascript:alert(1)", "app.kaila-app.com")).toBeNull();
    expect(deepLinkRoute("kaila://app/login?socialCode=return-code", "app.kaila-app.com")).toBe("/login?socialCode=return-code");
  });
  it("maps privacy-safe notification data to known screens", () => {
    expect(notificationRoute({ type: "message", jobId: "job-7" })).toBe("/jobs/job-7/hired/conversation");
    expect(notificationRoute({
      type: "call",
      contextType: "job",
      contextId: "job-7",
      callId: "call-1",
      media: "audio",
    })).toBe("/jobs/job-7/hired/conversation?callId=call-1&callAction=open&callMedia=audio&callContextType=job&callContextId=job-7");
    expect(notificationRoute({ type: "call", contextType: "job", contextId: "../admin", callId: "call-1" })).toBe("/notifications");
    expect(notificationRoute({ type: "message", jobId: "../admin" })).toBe("/notifications");
    expect(notificationRoute({ type: "unknown", jobId: "job-7" })).toBe("/notifications");
  });
  it("opens the existing public QR destinations without leaving the managed app", () => {
    expect(deepLinkRoute("https://kaila-app.com/post-job?category=plumbing#details", "app.kaila-app.com"))
      .toBe("/post-job?category=plumbing#details");
    expect(deepLinkRoute("https://kaila-app.com/post-job/", "app.kaila-app.com")).toBe("/post-job/");
    expect(deepLinkRoute("https://kaila-app.com/download", "app.kaila-app.com")).toBe("/home");
    expect(deepLinkRoute("https://app.kaila-app.com/download/", "app.kaila-app.com")).toBe("/home");
  });
  it.each([
    "https://kaila-app.com.evil.example/post-job",
    "https://evil.kaila-app.com/post-job",
    "http://kaila-app.com/post-job",
    "https://kaila-app.com:8443/post-job",
    "https://user:password@kaila-app.com/post-job",
    "https://kaila-app.com/downloads/kaila-android.apk",
    "https://kaila-app.com/post-job-other",
    "https://app.kaila-app.com//evil.example",
  ])("rejects untrusted or non-campaign URLs: %s", (url) => {
    expect(deepLinkRoute(url, "app.kaila-app.com")).toBeNull();
  });
  it("opens only authorized job call event shapes", () => {
    expect(incomingCallRoute({
      type: "call.ringing",
      data: { contextType: "job", contextId: "job-7", callId: "call-1", media: "video", callerName: "Ada" },
    })).toBe("/jobs/job-7/hired/conversation?callId=call-1&callAction=open&callMedia=video&callContextType=job&callContextId=job-7&callCallerName=Ada");
    expect(incomingCallRoute({ type: "call.ringing", data: { contextType: "direct", contextId: "job-7", callId: "call-1" } })).toBeNull();
    expect(incomingCallRoute({ type: "call.ringing", data: { contextType: "job", contextId: "../admin", callId: "call-1" } })).toBeNull();
    expect(incomingCallRoute({ type: "call.ringing", data: { contextType: "job", contextId: "job-7" } })).toBeNull();
  });
});
