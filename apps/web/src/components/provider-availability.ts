export type AvailabilitySlot = {
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
};

export type DaySchedule = {
  dayOfWeek: number;
  label: string;
  enabled: boolean;
  startsAt: string;
  endsAt: string;
};

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DEFAULT_WORKDAY_START = "08:00";
export const DEFAULT_WORKDAY_END = "17:00";

export function defaultAvailabilitySlots(): AvailabilitySlot[] {
  return [1, 2, 3, 4, 5].map((dayOfWeek) => ({
    dayOfWeek,
    startsAt: DEFAULT_WORKDAY_START,
    endsAt: DEFAULT_WORKDAY_END,
  }));
}

export function normalizeTimeValue(value: string): string {
  return value.slice(0, 5);
}

export function slotsToDaySchedules(slots: AvailabilitySlot[]): DaySchedule[] {
  const slotMap = new Map(slots.map((slot) => [slot.dayOfWeek, slot]));

  return WEEKDAY_LABELS.map((label, dayOfWeek) => {
    const slot = slotMap.get(dayOfWeek);
    return {
      dayOfWeek,
      label,
      enabled: Boolean(slot),
      startsAt: slot ? normalizeTimeValue(slot.startsAt) : DEFAULT_WORKDAY_START,
      endsAt: slot ? normalizeTimeValue(slot.endsAt) : DEFAULT_WORKDAY_END,
    };
  });
}

export function daySchedulesToSlots(schedules: DaySchedule[]): AvailabilitySlot[] {
  return schedules
    .filter((day) => day.enabled)
    .map(({ dayOfWeek, startsAt, endsAt }) => ({
      dayOfWeek,
      startsAt: normalizeTimeValue(startsAt),
      endsAt: normalizeTimeValue(endsAt),
    }));
}

export function parseProviderAvailability(
  rows: Array<{ day_of_week: number; starts_at: string; ends_at: string }> | undefined,
): AvailabilitySlot[] {
  if (!rows || rows.length === 0) {
    return defaultAvailabilitySlots();
  }

  return rows.map((row) => ({
    dayOfWeek: row.day_of_week,
    startsAt: normalizeTimeValue(row.starts_at),
    endsAt: normalizeTimeValue(row.ends_at),
  }));
}

function formatSummary(slots: AvailabilitySlot[]): string {
  if (slots.length === 0) {
    return "Choose at least one day.";
  }

  return slots
    .slice()
    .sort((left, right) => left.dayOfWeek - right.dayOfWeek)
    .map((slot) => {
      const label = WEEKDAY_LABELS[slot.dayOfWeek]?.slice(0, 3) ?? "Day";
      return `${label} ${slot.startsAt}–${slot.endsAt}`;
    })
    .join(" · ");
}

export { formatSummary };
