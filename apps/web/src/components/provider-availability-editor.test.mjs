import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  daySchedulesToSlots,
  defaultAvailabilitySlots,
  parseProviderAvailability,
  slotsToDaySchedules,
} from "./provider-availability.ts";

test("default availability covers Monday through Friday", () => {
  const slots = defaultAvailabilitySlots();
  assert.deepEqual(
    slots.map((slot) => slot.dayOfWeek),
    [1, 2, 3, 4, 5],
  );
  assert.equal(slots[0]?.startsAt, "08:00");
  assert.equal(slots[0]?.endsAt, "17:00");
});

test("parseProviderAvailability normalizes saved API rows", () => {
  const slots = parseProviderAvailability([
    { day_of_week: 0, starts_at: "09:00:00", ends_at: "18:00:00" },
    { day_of_week: 6, starts_at: "10:00:00", ends_at: "14:00:00" },
  ]);

  assert.deepEqual(slots, [
    { dayOfWeek: 0, startsAt: "09:00", endsAt: "18:00" },
    { dayOfWeek: 6, startsAt: "10:00", endsAt: "14:00" },
  ]);
});

test("day schedule helpers round-trip enabled days", () => {
  const schedules = slotsToDaySchedules(defaultAvailabilitySlots());
  schedules[1].enabled = false;
  schedules[1].startsAt = "07:30";
  schedules[6].enabled = true;
  schedules[6].startsAt = "08:00";
  schedules[6].endsAt = "12:00";

  assert.deepEqual(daySchedulesToSlots(schedules), [
    { dayOfWeek: 2, startsAt: "08:00", endsAt: "17:00" },
    { dayOfWeek: 3, startsAt: "08:00", endsAt: "17:00" },
    { dayOfWeek: 4, startsAt: "08:00", endsAt: "17:00" },
    { dayOfWeek: 5, startsAt: "08:00", endsAt: "17:00" },
    { dayOfWeek: 6, startsAt: "08:00", endsAt: "12:00" },
  ]);
});

test("provider profile page renders availability editor and submits selected slots", () => {
  const source = readFileSync(new URL("../app/provider-profile/page.tsx", import.meta.url), "utf8");
  assert.match(source, /ProviderAvailabilityEditor/);
  assert.match(source, /parseProviderAvailability\(provider\.availability\)/);
  assert.match(source, /availability: availabilitySlots/);
  assert.match(source, /Availability/);
});
