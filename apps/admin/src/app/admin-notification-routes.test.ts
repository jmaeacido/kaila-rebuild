import { describe, expect, it } from "vitest";

import { adminNotificationRoute } from "./admin-notification-routes";

describe("admin notification routing", () => {
  it("opens focused operational queues", () => {
    expect(adminNotificationRoute({ eventType: "admin.review.provider_submitted", resourceType: "provider_profile" })).toBe("/");
    expect(adminNotificationRoute({ eventType: "admin.identity.submitted", resourceType: "identity_verification", verificationId: "01a08433-d18e-7103-a2aa-8bb0e35b4fdb" })).toBe("/identity-verifications");
    expect(adminNotificationRoute({ eventType: "admin.identity.appeal_requested", resourceType: "identity_verification" })).toBe("/identity-verifications");
    expect(adminNotificationRoute({ eventType: "report.opened", reportId: "report-7" })).toBe("/reports?report=report-7");
    expect(adminNotificationRoute({ eventType: "dispute.opened", caseId: "case-4" })).toBe("/cases?case=case-4");
    expect(adminNotificationRoute({ eventType: "support.case.created", caseId: "case-8" })).toBe("/support?case=case-8");
    expect(adminNotificationRoute({ eventType: "support.message.created", caseId: "case-8", messageId: "42" })).toBe("/support?case=case-8&message=42");
  });

  it("rejects unsafe resource identifiers", () => {
    expect(adminNotificationRoute({ eventType: "report.opened", reportId: "../users" })).toBe("/reports");
  });
});
