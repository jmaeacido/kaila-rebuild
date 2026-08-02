"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  CircleHelp,
  EllipsisVertical,
  Home,
  LifeBuoy,
  LogOut,
  Monitor,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import { useTheme } from "../app/theme-provider";
import type { ThemePreference } from "../app/theme";
import styles from "./session-menu.module.css";

const THEME_OPTIONS: Array<{ id: ThemePreference; label: string; Icon: typeof Sun }> = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
];

type SessionMenuProps = {
  loggingOut?: boolean;
  onSignOut: () => void;
};

export function SessionMenu({ loggingOut = false, onSignOut }: SessionMenuProps) {
  const { preference, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

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

  function close() {
    setOpen(false);
  }

  return (
    <div className={`sessionMenu ${styles.root}`} ref={root}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Open options menu"
        title="Options"
        onClick={() => setOpen((value) => !value)}
      >
        <EllipsisVertical aria-hidden="true" />
        <span className={styles.triggerLabel}>Options</span>
      </button>
      {open ? (
        <div className={styles.menu} id={menuId} role="menu" aria-label="Options">
          <Link className={styles.item} href="/account" prefetch={false} role="menuitem" onClick={close}>
            <UserRound aria-hidden="true" />
            <span>Account</span>
          </Link>
          <Link className={styles.item} href="/settings" prefetch={false} role="menuitem" onClick={close}>
            <Settings aria-hidden="true" />
            <span>Settings</span>
          </Link>
          <Link className={styles.item} href="/support" prefetch={false} role="menuitem" onClick={close}>
            <LifeBuoy aria-hidden="true" />
            <span>Support</span>
          </Link>
          <Link className={styles.item} href="/faqs" prefetch={false} role="menuitem" onClick={close}>
            <CircleHelp aria-hidden="true" />
            <span>FAQs</span>
          </Link>
          <Link className={styles.item} href="/safety" prefetch={false} role="menuitem" onClick={close}>
            <ShieldCheck aria-hidden="true" />
            <span>Safety</span>
          </Link>

          <div className={styles.separator} role="separator" />
          <p className={styles.sectionLabel} id={`${menuId}-appearance`}>Appearance</p>
          <div className={styles.themeRow} role="group" aria-labelledby={`${menuId}-appearance`}>
            {THEME_OPTIONS.map(({ id, label, Icon }) => {
              const selected = preference === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className={selected ? styles.themeActive : styles.themeOption}
                  onClick={() => {
                    void setPreference(id);
                  }}
                >
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.separator} role="separator" />
          <Link className={styles.item} href="/home" prefetch={false} role="menuitem" onClick={close}>
            <Home aria-hidden="true" />
            <span>Home</span>
          </Link>
          <button
            type="button"
            className={`${styles.dangerItem} sessionMenuDanger`}
            role="menuitem"
            disabled={loggingOut}
            onClick={() => {
              close();
              onSignOut();
            }}
          >
            <LogOut aria-hidden="true" />
            <span>{loggingOut ? "Signing out…" : "Sign out"}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
