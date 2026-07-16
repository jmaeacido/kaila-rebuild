import { deepLinkRoute, notificationRoute } from "./routes";
import { describe, expect, it } from "vitest";

describe("mobile routing", () => {
  it("routes only trusted deep links", () => {
    expect(deepLinkRoute("https://app.kaila-app.com/jobs/abc/work", "app.kaila-app.com")).toBe("/jobs/abc/work");
    expect(deepLinkRoute("https://evil.example/jobs/abc/work", "app.kaila-app.com")).toBeNull();
    expect(deepLinkRoute("javascript:alert(1)", "app.kaila-app.com")).toBeNull();
  });
  it("maps privacy-safe notification data to known screens", () => {
    expect(notificationRoute({ type: "message", jobId: "job-7" })).toBe("/jobs/job-7/hired/conversation");
    expect(notificationRoute({ type: "message", jobId: "../admin" })).toBe("/notifications");
    expect(notificationRoute({ type: "unknown", jobId: "job-7" })).toBe("/notifications");
  });
});
