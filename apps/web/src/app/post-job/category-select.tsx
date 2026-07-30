"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { ServiceCategoryIcon } from "../../components/service-category-icon";
import styles from "./page.module.css";

export type ServiceCategory = {
  id: number;
  name: string;
  icon: string;
};

export function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: ServiceCategory[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = categories.find((category) => String(category.id) === value);

  useEffect(() => {
    if (!open) return;

    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function focusOption(direction: 1 | -1) {
    const options = Array.from(
      rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
    );
    if (!options.length) return;
    const current = options.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      current < 0
        ? direction === 1
          ? 0
          : options.length - 1
        : (current + direction + options.length) % options.length;
    options[next]?.focus();
  }

  return (
    <div
      className={styles.categorySelect}
      ref={rootRef}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          triggerRef.current?.focus();
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (!open) {
            setOpen(true);
            requestAnimationFrame(() => focusOption(event.key === "ArrowDown" ? 1 : -1));
          } else {
            focusOption(event.key === "ArrowDown" ? 1 : -1);
          }
        }
      }}
    >
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Service"
        className={styles.categoryTrigger}
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <span>
          {selected && <ServiceCategoryIcon icon={selected.icon} aria-hidden="true" />}
          {selected?.name ?? "Choose a service"}
        </span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.categoryOptions} role="listbox" aria-label="Services">
          {categories.map((category) => {
            const isSelected = String(category.id) === value;
            return (
              <button
                aria-selected={isSelected}
                key={category.id}
                onClick={() => {
                  onChange(String(category.id));
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                role="option"
                type="button"
              >
                <ServiceCategoryIcon icon={category.icon} aria-hidden="true" />
                <span>{category.name}</span>
                {isSelected && <Check aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
