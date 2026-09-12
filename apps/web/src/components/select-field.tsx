"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { ServiceCategoryBadge } from "./service-category-icon";
import styles from "./select-field.module.css";

export type SelectOption = { value: string; label: string; disabled?: boolean; serviceIcon?: string };

export type SelectOptionGroup = {
  label: string;
  options?: SelectOption[];
  groups?: SelectOptionGroup[];
};

function flattenOptions(options: SelectOption[], groups?: SelectOptionGroup[]): SelectOption[] {
  if (!groups?.length) return options;
  return groups.flatMap((group) => [
    ...(group.options ?? []),
    ...flattenOptions([], group.groups),
  ]);
}

function filterGroups(groups: SelectOptionGroup[], query: string): SelectOptionGroup[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return groups;

  return groups.flatMap((group) => {
    const labelMatch = group.label.toLowerCase().includes(needle);
    if (labelMatch) return [group];

    const nested = group.groups ? filterGroups(group.groups, query) : undefined;
    const options = (group.options ?? []).filter((option) => option.label.toLowerCase().includes(needle));
    if (!options.length && !nested?.length) return [];

    return [{
      label: group.label,
      options: options.length ? options : undefined,
      groups: nested?.length ? nested : undefined,
    }];
  });
}

function renderGroupedOptions({
  groups,
  currentValue,
  choose,
}: {
  groups: SelectOptionGroup[];
  currentValue: string;
  choose: (value: string) => void;
}) {
  return groups.map((group) => (
    <div className={styles.group} key={group.label}>
      <p className={styles.groupLabel}>{group.label}</p>
      {group.groups?.map((subgroup) => (
        <div className={styles.subgroup} key={`${group.label}:${subgroup.label}`}>
          <p className={styles.subgroupLabel}>{subgroup.label}</p>
          {(subgroup.options ?? []).map((option) => (
            <button
              aria-selected={option.value === currentValue}
              disabled={option.disabled}
              key={option.value}
              onClick={() => choose(option.value)}
              role="option"
              type="button"
            >
              {option.serviceIcon ? <ServiceCategoryBadge icon={option.serviceIcon} /> : null}
              <span className={styles.optionLabel}>{option.label}</span>
              {option.value === currentValue ? <Check aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ))}
      {(group.options ?? []).map((option) => (
        <button
          aria-selected={option.value === currentValue}
          disabled={option.disabled}
          key={option.value}
          onClick={() => choose(option.value)}
          role="option"
          type="button"
        >
          {option.serviceIcon ? <ServiceCategoryBadge icon={option.serviceIcon} /> : null}
          <span className={styles.optionLabel}>{option.label}</span>
          {option.value === currentValue ? <Check aria-hidden="true" /> : null}
        </button>
      ))}
    </div>
  ));
}

export function SelectField({
  label,
  options = [],
  groups,
  value,
  defaultValue = "",
  onChange,
  name,
  required = false,
  disabled = false,
  placeholder = "Choose an option",
  describedBy,
  placeholderServiceIcon,
  searchable = false,
  searchPlaceholder = "Search…",
}: {
  label: string;
  options?: SelectOption[];
  groups?: SelectOptionGroup[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  describedBy?: string;
  placeholderServiceIcon?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [placement, setPlacement] = useState<"above" | "below">("below");
  const [maxHeight, setMaxHeight] = useState("20rem");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const currentValue = value ?? internalValue;
  const allOptions = useMemo(() => flattenOptions(options, groups), [groups, options]);
  const selected = allOptions.find((option) => option.value === currentValue);
  const visibleGroups = useMemo(
    () => (groups ? filterGroups(groups, searchable ? query : "") : undefined),
    [groups, query, searchable],
  );
  const visibleOptions = useMemo(() => {
    if (groups) return [];
    if (!searchable || !query.trim()) return options;
    const needle = query.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [groups, options, query, searchable]);
  const hasVisibleChoices = groups
    ? (visibleGroups?.length ?? 0) > 0
    : visibleOptions.length > 0;

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    if (searchable) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, searchable]);

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
  }, [open, allOptions.length, query]);

  function choose(next: string) {
    if (value === undefined) setInternalValue(next);
    onChange?.(next);
    setInvalid(false);
    setOpen(false);
    setQuery("");
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function move(direction: 1 | -1) {
    const choices = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)') ?? []);
    if (!choices.length) return;
    const index = choices.indexOf(document.activeElement as HTMLButtonElement);
    choices[index < 0 ? (direction === 1 ? 0 : choices.length - 1) : (index + direction + choices.length) % choices.length]?.focus();
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      requestAnimationFrame(() => move(event.key === "ArrowDown" ? 1 : -1));
    }
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
        {allOptions.map((option) => (
          <option disabled={option.disabled} key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {open && searchable ? (
        <div className={styles.trigger} data-searching="true">
          <input
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={open}
            aria-invalid={invalid || undefined}
            aria-label={`Search ${label}`}
            disabled={disabled}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onTriggerKeyDown}
            placeholder={searchPlaceholder}
            ref={searchRef}
            role="combobox"
            type="search"
            value={query}
          />
          <ChevronDown aria-hidden="true" />
        </div>
      ) : (
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
          onKeyDown={onTriggerKeyDown}
          ref={triggerRef}
          role="combobox"
          type="button"
        >
          <span className={selected ? undefined : styles.placeholder}>
            {(selected?.serviceIcon || placeholderServiceIcon) && (
              <ServiceCategoryBadge icon={selected?.serviceIcon || placeholderServiceIcon || "Ellipsis"} />
            )}
            <span className={styles.optionLabel}>{selected?.label ?? placeholder}</span>
          </span>
          <ChevronDown aria-hidden="true" />
        </button>
      )}
      {open ? (
        <div className={styles.options} data-placement={placement} id={listboxId} role="listbox" aria-label={label} style={{ maxHeight }}>
          {!required && !(searchable && query.trim()) ? (
            <button aria-selected={!currentValue} onClick={() => choose("")} role="option" type="button">
              {placeholderServiceIcon ? <ServiceCategoryBadge icon={placeholderServiceIcon} /> : null}
              <span className={styles.optionLabel}>{placeholder}</span>
              {!currentValue ? <Check aria-hidden="true" /> : null}
            </button>
          ) : null}
          {groups
            ? renderGroupedOptions({ groups: visibleGroups ?? [], currentValue, choose })
            : visibleOptions.map((option) => (
                <button
                  aria-selected={option.value === currentValue}
                  disabled={option.disabled}
                  key={option.value}
                  onClick={() => choose(option.value)}
                  role="option"
                  type="button"
                >
                  {option.serviceIcon ? <ServiceCategoryBadge icon={option.serviceIcon} /> : null}
                  <span className={styles.optionLabel}>{option.label}</span>
                  {option.value === currentValue ? <Check aria-hidden="true" /> : null}
                </button>
              ))}
          {searchable && !hasVisibleChoices ? (
            <p className={styles.empty}>No matches</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
