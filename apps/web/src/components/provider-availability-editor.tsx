"use client";

import { useMemo } from "react";
import {
  daySchedulesToSlots,
  formatSummary,
  slotsToDaySchedules,
  type AvailabilitySlot,
} from "./provider-availability";
import styles from "./provider-availability-editor.module.css";

export type { AvailabilitySlot, DaySchedule } from "./provider-availability";
export {
  defaultAvailabilitySlots,
  parseProviderAvailability,
} from "./provider-availability";

export function ProviderAvailabilityEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: AvailabilitySlot[];
  onChange: (slots: AvailabilitySlot[]) => void;
  disabled?: boolean;
}) {
  const schedules = useMemo(() => slotsToDaySchedules(value), [value]);
  const enabledCount = value.length;
  const summary = formatSummary(value);

  function updateDay(
    dayOfWeek: number,
    patch: Partial<{ enabled: boolean; startsAt: string; endsAt: string }>,
  ) {
    const nextSchedules = schedules.map((day) =>
      day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day,
    );
    onChange(daySchedulesToSlots(nextSchedules));
  }

  return (
    <div className={styles.section}>
      <p className={styles.intro}>
        Choose the days and hours you usually accept jobs. Scheduled requests only match when they fall inside these windows.
      </p>
      <ul className={styles.list}>
        {schedules.map((day) => (
          <li
            key={day.dayOfWeek}
            className={`${styles.row} ${day.enabled ? styles.rowEnabled : ""}`}
          >
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={day.enabled}
                disabled={disabled}
                onChange={(event) => updateDay(day.dayOfWeek, { enabled: event.target.checked })}
              />
              <span>{day.label}</span>
            </label>
            {day.enabled && (
              <div className={styles.times}>
                <label>
                  From
                  <input
                    type="time"
                    required
                    disabled={disabled}
                    value={day.startsAt}
                    onChange={(event) => updateDay(day.dayOfWeek, { startsAt: event.target.value })}
                  />
                </label>
                <label>
                  Until
                  <input
                    type="time"
                    required
                    disabled={disabled}
                    value={day.endsAt}
                    min={day.startsAt}
                    onChange={(event) => updateDay(day.dayOfWeek, { endsAt: event.target.value })}
                  />
                </label>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className={styles.summary}>
        <strong>{enabledCount} day{enabledCount === 1 ? "" : "s"} selected.</strong> {summary}
      </p>
    </div>
  );
}
