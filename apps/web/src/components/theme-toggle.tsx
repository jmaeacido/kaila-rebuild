"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../app/theme-provider";
import type { ThemePreference } from "../app/theme";
import styles from "./theme-toggle.module.css";

const OPTIONS: Array<{ id: ThemePreference; label: string; Icon: typeof Sun }> = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference, resolved } = useTheme();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const CurrentIcon = OPTIONS.find((option) => option.id === preference)?.Icon ?? Monitor;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`${styles.root} ${className ?? ""}`.trim()} ref={root}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Appearance: ${preference}. Currently ${resolved}. Change theme`}
        title="Change theme"
        onClick={() => setOpen((value) => !value)}
      >
        <CurrentIcon aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.menu} id={menuId} role="menu" aria-label="Appearance">
          {OPTIONS.map(({ id, label, Icon }) => {
            const selected = preference === id;
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={selected ? styles.optionActive : styles.option}
                onClick={() => {
                  void setPreference(id);
                  setOpen(false);
                }}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
