import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { adminDestinations } from "../admin-destinations";

const shell = readFileSync(new URL("./admin-shell-nav.tsx", import.meta.url), "utf8");
const notificationCenter = readFileSync(new URL("./admin-notification-center.tsx", import.meta.url), "utf8");

describe("admin shell destinations", () => {
  it("exposes every operations section linked from desktop navigation", () => {
    expect(adminDestinations.map((item) => item.label)).toEqual([
      "Review",
      "People",
      "Maintenance",
      "Support",
      "Disputes",
      "Safety",
      "Deletions",
      "Insights",
    ]);
    expect(adminDestinations.map((item) => item.href)).toEqual([
      "/",
      "/users",
      "/maintenance",
      "/support",
      "/cases",
      "/reports",
      "/account-deletions",
      "/analytics",
    ]);
  });

  it("surfaces durable realtime notifications in the authenticated shell", () => {
    expect(shell).toContain("<AdminNotificationCenter />");
    expect(notificationCenter).toContain('socket.on("domain.event"');
    expect(notificationCenter).toContain('/api/v1/notifications');
    expect(notificationCenter).toContain('role="status"');
    expect(notificationCenter).toContain("adminNotificationRoute");
  });
});
