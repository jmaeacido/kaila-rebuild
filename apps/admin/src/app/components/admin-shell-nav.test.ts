import { describe, expect, it } from "vitest";
import { adminDestinations } from "../admin-destinations";

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
});
