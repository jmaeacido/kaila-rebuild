"use client";

import styles from "./page.module.css";

const sliderMinimum = 0;
const sliderMaximum = 10_000;
const sliderStep = 50;
const allowedMaximum = 1_000_000;

function sliderValue(value: string, fallback: number): number {
  if (value === "") return fallback;

  return Math.min(sliderMaximum, Math.max(sliderMinimum, Number(value)));
}

function pesos(value: string, fallback: string): string {
  if (value === "") return fallback;

  return `₱${Number(value).toLocaleString("en-PH")}`;
}

export function BudgetRange({
  minimum,
  maximum,
  onMinimumChange,
  onMaximumChange,
}: {
  minimum: string;
  maximum: string;
  onMinimumChange: (value: string) => void;
  onMaximumChange: (value: string) => void;
}) {
  const lower = sliderValue(minimum, sliderMinimum);
  const upper = sliderValue(maximum, sliderMaximum);
  const selectedStart = Math.min(lower, upper);
  const selectedEnd = Math.max(lower, upper);
  const rangeStart = (selectedStart / sliderMaximum) * 100;
  const rangeEnd = (selectedEnd / sliderMaximum) * 100;

  return (
    <fieldset className={styles.budgetRange}>
      <legend>What’s your budget?</legend>
      <p className={styles.budgetHint}>
        Drag the bracket for a quick range, or type an exact amount below.
      </p>
      <div className={styles.budgetValues} aria-hidden="true">
        <span>{pesos(minimum, "No minimum")}</span>
        <span>{pesos(maximum, "No maximum")}</span>
      </div>
      <div className={styles.rangeControl}>
        <div className={styles.rangeRail} aria-hidden="true" />
        <div
          className={styles.rangeSelection}
          style={{ left: `${rangeStart}%`, right: `${100 - rangeEnd}%` }}
          aria-hidden="true"
        />
        <input
          className={styles.rangeInput}
          type="range"
          min={sliderMinimum}
          max={sliderMaximum}
          step={sliderStep}
          value={Math.min(lower, upper)}
          onChange={(event) =>
            onMinimumChange(String(Math.min(Number(event.target.value), upper)))
          }
          aria-label="Minimum budget"
        />
        <input
          className={styles.rangeInput}
          type="range"
          min={sliderMinimum}
          max={sliderMaximum}
          step={sliderStep}
          value={Math.max(lower, upper)}
          onChange={(event) =>
            onMaximumChange(String(Math.max(Number(event.target.value), lower)))
          }
          aria-label="Maximum budget"
        />
      </div>
      <div className={styles.rangeScale} aria-hidden="true">
        <span>₱0</span>
        <span>₱10,000</span>
      </div>
      <div className={styles.budgetInputs}>
        <label>
          From (₱)
          <input
            type="number"
            inputMode="numeric"
            min={sliderMinimum}
            max={maximum || allowedMaximum}
            step={1}
            value={minimum}
            onChange={(event) => onMinimumChange(event.target.value)}
            placeholder="No minimum"
          />
        </label>
        <label>
          To (₱)
          <input
            type="number"
            inputMode="numeric"
            min={minimum || sliderMinimum}
            max={allowedMaximum}
            step={1}
            value={maximum}
            onChange={(event) => onMaximumChange(event.target.value)}
            placeholder="No maximum"
          />
        </label>
      </div>
      <p className={styles.budgetLimit}>
        The slider covers up to ₱10,000 in ₱50 steps. Type a higher amount if needed.
      </p>
    </fieldset>
  );
}
