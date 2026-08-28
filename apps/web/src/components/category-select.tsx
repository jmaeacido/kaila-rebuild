"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { ServiceCategoryIcon } from "./service-category-icon";
import styles from "./category-select.module.css";

export type ServiceCategory = {
  id: number;
  name: string;
  icon: string;
};

export function CategorySelect({
  categories,
  value,
  onChange,
  disabled = false,
  placeholder = "Choose a service",
  label = "Service",
  bottomBoundaryId,
}: {
  categories: ServiceCategory[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  bottomBoundaryId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"below" | "above">("below");
  const [maxHeight, setMaxHeight] = useState("20rem");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const selected = categories.find((category) => String(category.id) === value);

  useEffect(() => {
    if (!open) return;

    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;

    const updatePlacement = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportPadding = 16;
      const boundaryTop = bottomBoundaryId
        ? document.getElementById(bottomBoundaryId)?.getBoundingClientRect().top
        : undefined;
      const usableBottom = Math.min(window.visualViewport?.height ?? window.innerHeight, boundaryTop ?? Number.POSITIVE_INFINITY);
      const spaceBelow = usableBottom - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const nextPlacement = spaceBelow < 12 * 16 && spaceAbove > spaceBelow ? "above" : "below";
      const available = Math.max(160, nextPlacement === "below" ? spaceBelow : spaceAbove);

      setPlacement(nextPlacement);
      setMaxHeight(`${available}px`);
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [open, categories.length, bottomBoundaryId]);

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
      className={styles.root}
      ref={rootRef}
      onKeyDown={(event) => {
        if (disabled) return;
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
        aria-label={label}
        className={styles.trigger}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        ref={triggerRef}
        type="button"
      >
        <span>
          {selected && <ServiceCategoryIcon icon={selected.icon} aria-hidden="true" />}
          {selected?.name ?? placeholder}
        </span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div
          className={styles.options}
          data-placement={placement}
          ref={optionsRef}
          role="listbox"
          aria-label={label}
          style={{ maxHeight }}
        >
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
