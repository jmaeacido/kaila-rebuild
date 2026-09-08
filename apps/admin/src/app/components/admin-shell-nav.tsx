"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { adminDestinations } from "../admin-destinations";
import { adminAuthenticatedEvent, adminSignedOutEvent } from "../admin-session-events";
import styles from "./admin-shell-nav.module.css";
import { AdminNotificationCenter } from "./admin-notification-center";
import { AppearanceSwitcher } from "./appearance-switcher";
import { ThemeWordmark } from "./theme-wordmark";

const authPaths = new Set(["/forgot-password", "/reset-password"]);

export function AdminShellNav() {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  const refreshSession = useCallback(() => {
    let active = true;
    void fetch("/api/v1/auth/session-status", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return false;
        return ((await response.json()) as { data: { authenticated: boolean } }).data.authenticated;
      })
      .then((value) => {
        if (active) setAuthenticated(value);
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const cancel = refreshSession();
    const onAuthenticated = () => setAuthenticated(true);
    const onSignedOut = () => setAuthenticated(false);
    window.addEventListener(adminAuthenticatedEvent, onAuthenticated);
    window.addEventListener(adminSignedOutEvent, onSignedOut);
    return () => {
      cancel?.();
      window.removeEventListener(adminAuthenticatedEvent, onAuthenticated);
      window.removeEventListener(adminSignedOutEvent, onSignedOut);
    };
  }, [pathname, refreshSession]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  if (!authenticated || authPaths.has(pathname)) return null;

  return (
    <header className={styles.shell}>
      <div className={styles.bar}>
        <Link className={styles.brand} href="/" aria-label="KAILA administration home">
          <ThemeWordmark priority />
          <span>Operations</span>
        </Link>

        <nav aria-label="Administration" className={styles.desktopNav}>
          {adminDestinations.map(({ href, label, icon: Icon }) => {
            const current = pathname === href;
            return (
              <Link aria-current={current ? "page" : undefined} href={href} key={href}>
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.tools}>
          <div className={styles.topAppearance}>
            <AppearanceSwitcher embedded />
          </div>
          <AdminNotificationCenter />
          <button
            aria-controls={menuId}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            className={styles.menuButton}
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className={styles.drawerBackdrop} onClick={() => setMenuOpen(false)}>
          <nav
            aria-label="Administration menu"
            className={styles.drawer}
            id={menuId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <Link
                aria-label="KAILA administration home"
                className={styles.drawerBrand}
                href="/"
                onClick={() => setMenuOpen(false)}
              >
                <ThemeWordmark />
              </Link>
              <button
                aria-label="Close navigation menu"
                className={styles.drawerClose}
                onClick={() => setMenuOpen(false)}
                type="button"
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <p className={styles.drawerTitle}>Operations</p>
            {adminDestinations.map(({ href, label, icon: Icon }) => {
              const current = pathname === href;
              return (
                <Link
                  aria-current={current ? "page" : undefined}
                  href={href}
                  key={href}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              );
            })}
            <div className={styles.drawerAppearance}>
              <span>Appearance</span>
              <AppearanceSwitcher embedded />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
