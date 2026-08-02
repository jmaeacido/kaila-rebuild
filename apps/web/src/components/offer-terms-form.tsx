"use client";

import { FormEvent, useId, useState } from "react";
import { ChevronDown, PhilippinePeso } from "lucide-react";
import { Button, TextField } from "@kaila/ui";
import styles from "./offer-terms-form.module.css";

export type OfferTermsDefaults = {
  amountCentavos?: number | null;
  availabilityText?: string | null;
  estimatedDurationText?: string | null;
  scope?: string | null;
  message?: string | null;
};

export type OfferTermsPayload = {
  amountCentavos: number;
  availabilityText: string;
  estimatedDurationText: string | null;
  scope: string | null;
  message: string | null;
  expiresAt: null;
};

type OfferTermsFormProps = {
  defaults?: OfferTermsDefaults;
  submitLabel: string;
  saving?: boolean;
  onSubmit: (payload: OfferTermsPayload) => void | Promise<void>;
};

export function OfferTermsForm({
  defaults,
  submitLabel,
  saving = false,
  onSubmit,
}: OfferTermsFormProps) {
  const id = useId();
  const hasExtra =
    Boolean(defaults?.estimatedDurationText)
    || Boolean(defaults?.scope)
    || Boolean(defaults?.message);
  const [showExtras, setShowExtras] = useState(hasExtra);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amountPesos = Number(data.get("amount"));
    const availabilityText = String(data.get("availability") || "").trim();
    if (!Number.isFinite(amountPesos) || amountPesos < 1 || availabilityText.length < 1) {
      return;
    }
    await onSubmit({
      amountCentavos: Math.round(amountPesos * 100),
      availabilityText: availabilityText.slice(0, 160),
      estimatedDurationText: String(data.get("duration") || "").trim() || null,
      scope: String(data.get("scope") || "").trim() || null,
      message: String(data.get("message") || "").trim() || null,
      expiresAt: null,
    });
  }

  return (
    <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
      <p className={styles.lead}>
        <PhilippinePeso aria-hidden="true" />
        Price and timing are enough to compete. Add details only if they help you stand out.
      </p>
      <TextField
        id={`${id}-amount`}
        label="Your price (₱)"
        name="amount"
        type="number"
        min="1"
        step="0.01"
        required
        autoFocus
        defaultValue={defaults?.amountCentavos ? defaults.amountCentavos / 100 : undefined}
      />
      <TextField
        id={`${id}-availability`}
        label="When can you start?"
        name="availability"
        placeholder="Today at 2 PM"
        maxLength={160}
        required
        defaultValue={defaults?.availabilityText ?? undefined}
      />
      <button
        className={styles.extrasToggle}
        type="button"
        aria-expanded={showExtras}
        onClick={() => setShowExtras((open) => !open)}
      >
        <ChevronDown aria-hidden="true" data-open={showExtras} />
        {showExtras ? "Hide optional details" : "Add optional details"}
      </button>
      {showExtras && (
        <div className={styles.extras}>
          <TextField
            id={`${id}-duration`}
            label="Estimated duration"
            name="duration"
            placeholder="About two hours"
            maxLength={160}
            defaultValue={defaults?.estimatedDurationText ?? undefined}
          />
          <label>
            What’s included
            <span>Optional</span>
            <textarea
              name="scope"
              maxLength={2000}
              rows={3}
              placeholder="Labor, parts, cleanup…"
              defaultValue={defaults?.scope ?? undefined}
            />
          </label>
          <label>
            Message to the client
            <span>Optional</span>
            <textarea
              name="message"
              maxLength={1000}
              rows={3}
              placeholder="A short note that builds trust"
              defaultValue={defaults?.message ?? undefined}
            />
          </label>
        </div>
      )}
      <Button type="submit" isLoading={saving}>{submitLabel}</Button>
    </form>
  );
}

export function suggestedAvailability(scheduleType: string, scheduledAt: string | null): string {
  if (scheduleType === "asap") return "As soon as possible";
  if (!scheduledAt) return "";
  return new Date(scheduledAt).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function suggestedAmountCentavos(
  budgetMinCentavos: number | null,
  budgetMaxCentavos: number | null,
): number | null {
  if (budgetMaxCentavos !== null) return budgetMaxCentavos;
  if (budgetMinCentavos !== null) return budgetMinCentavos;
  return null;
}
