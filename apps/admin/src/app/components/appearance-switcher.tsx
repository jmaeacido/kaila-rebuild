"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./appearance-switcher.module.css";

export type AppearanceTheme = "light" | "dark" | "system";

const storageKey = "kaila-admin-appearance";
const choices = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

function isAppearanceTheme(value: string | null): value is AppearanceTheme {
  return value === "light" || value === "dark" || value === "system";
}

function applyTheme(preference: AppearanceTheme) {
  const resolved =
    preference === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference;

  document.documentElement.dataset.appearance = preference;
  document.documentElement.dataset.theme = resolved;
}

export function AppearanceSwitcher() {
  const [preference, setPreference] = useState<AppearanceTheme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    const initial = isAppearanceTheme(stored) ? stored : "light";
    applyTheme(initial);
    const syncSelection = window.setTimeout(() => setPreference(initial), 0);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      if (window.localStorage.getItem(storageKey) === "system") {
        applyTheme("system");
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const next = isAppearanceTheme(event.newValue) ? event.newValue : "light";
      setPreference(next);
      applyTheme(next);
    };

    media.addEventListener("change", handleSystemChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.clearTimeout(syncSelection);
      media.removeEventListener("change", handleSystemChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function select(next: AppearanceTheme) {
    window.localStorage.setItem(storageKey, next);
    setPreference(next);
    applyTheme(next);
  }

  return (
    <div className={styles.switcher} aria-label="Appearance" role="radiogroup">
      {choices.map(({ value, label, icon: Icon }) => (
        <button
          aria-checked={preference === value}
          aria-label={`${label} appearance`}
          className={styles.choice}
          key={value}
          onClick={() => select(value)}
          role="radio"
          title={label}
          type="button"
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
