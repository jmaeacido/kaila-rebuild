"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminDestinations } from "../admin-destinations";
import { adminAuthenticatedEvent, adminSignedOutEvent } from "../admin-session-events";
import styles from "./admin-shell-nav.module.css";
import { ThemeWordmark } from "./theme-wordmark";

const authPaths = new Set(["/forgot-password", "/reset-password"]);

export function AdminShellNav() {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);

  const refreshSession = useCallback(() => {
    if (authPaths.has(pathname)) {
      setAuthenticated(false);
      return;
    }
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
  }, [pathname]);

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
  }, [refreshSession]);

  if (!authenticated || authPaths.has(pathname)) return null;

  return (
    <header className={styles.shell}>
      <div className={styles.bar}>
        <Link className={styles.brand} href="/" aria-label="KAILA administration home">
          <ThemeWordmark priority />
          <span>Operations</span>
        </Link>
        <nav aria-label="Administration">
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
      </div>
    </header>
  );
}
