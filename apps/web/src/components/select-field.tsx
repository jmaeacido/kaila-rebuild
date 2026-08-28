"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import styles from "./select-field.module.css";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export function SelectField({
  label,
  options,
  value,
  defaultValue = "",
  onChange,
  name,
  required = false,
  disabled = false,
  placeholder = "Choose an option",
  describedBy,
}: {
  label: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  describedBy?: string;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [placement, setPlacement] = useState<"above" | "below">("below");
  const [maxHeight, setMaxHeight] = useState("20rem");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const currentValue = value ?? internalValue;
  const selected = options.find((option) => option.value === currentValue);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form || value !== undefined) return;
    const reset = () => {
      setInternalValue(defaultValue);
      setInvalid(false);
    };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [defaultValue, value]);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const update = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewportPadding = 16;
      const below = window.innerHeight - rect.bottom - viewportPadding;
      const above = rect.top - viewportPadding;
      const next = below < 192 && above > below ? "above" : "below";
      setPlacement(next);
      setMaxHeight(`${Math.max(144, next === "below" ? below : above)}px`);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, options.length]);

  function choose(next: string) {
    if (value === undefined) setInternalValue(next);
    onChange?.(next);
    setInvalid(false);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function move(direction: 1 | -1) {
    const choices = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)') ?? []);
    if (!choices.length) return;
    const index = choices.indexOf(document.activeElement as HTMLButtonElement);
    choices[index < 0 ? (direction === 1 ? 0 : choices.length - 1) : (index + direction + choices.length) % choices.length]?.focus();
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <select
        aria-hidden="true"
        className={styles.native}
        disabled={disabled}
        name={name}
        onChange={() => undefined}
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(true);
          triggerRef.current?.focus();
        }}
        required={required}
        tabIndex={-1}
        value={currentValue}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => <option disabled={option.disabled} key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <button
        aria-controls={open ? listboxId : undefined}
        aria-describedby={describedBy}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={invalid || undefined}
        aria-label={label}
        className={styles.trigger}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) setOpen(true);
            requestAnimationFrame(() => move(event.key === "ArrowDown" ? 1 : -1));
          }
        }}
        ref={triggerRef}
        role="combobox"
        type="button"
      >
        <span className={selected ? undefined : styles.placeholder}>{selected?.label ?? placeholder}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open ? (
        <div className={styles.options} data-placement={placement} id={listboxId} role="listbox" aria-label={label} style={{ maxHeight }}>
          {!required ? <button aria-selected={!currentValue} onClick={() => choose("")} role="option" type="button"><span>{placeholder}</span>{!currentValue ? <Check aria-hidden="true" /> : null}</button> : null}
          {options.map((option) => (
            <button aria-selected={option.value === currentValue} disabled={option.disabled} key={option.value} onClick={() => choose(option.value)} role="option" type="button">
              <span>{option.label}</span>{option.value === currentValue ? <Check aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
