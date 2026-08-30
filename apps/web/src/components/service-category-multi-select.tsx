"use client";

import { Check } from "lucide-react";
import { ServiceCategoryIcon } from "./service-category-icon";
import type { ServiceCategory } from "./category-select";
import styles from "./service-category-multi-select.module.css";

export function ServiceCategoryMultiSelect({
  categories,
  values,
  onChange,
  disabled = false,
}: {
  categories: ServiceCategory[];
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}) {
  function toggle(value: string) {
    onChange(
      values.includes(value)
        ? values.filter((selectedValue) => selectedValue !== value)
        : [...values, value],
    );
  }

  return (
    <fieldset className={styles.fieldset} disabled={disabled}>
      <legend>Services offered</legend>
      <div className={styles.heading}>
        <span>Choose every service clients can hire you for.</span>
        <strong>{values.length} selected</strong>
      </div>
      <div className={styles.options}>
        {categories.map((category) => {
          const value = String(category.id);
          const selected = values.includes(value);

          return (
            <label className={styles.option} data-selected={selected} key={category.id}>
              <input
                checked={selected}
                onChange={() => toggle(value)}
                type="checkbox"
                value={value}
              />
              <ServiceCategoryIcon icon={category.icon} aria-hidden="true" />
              <span>{category.name}</span>
              <Check className={styles.check} aria-hidden="true" />
            </label>
          );
        })}
      </div>
      {categories.length === 0 && !disabled && <p>No services are available right now.</p>}
    </fieldset>
  );
}
