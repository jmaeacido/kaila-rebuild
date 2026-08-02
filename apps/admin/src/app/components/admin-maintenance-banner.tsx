"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Construction, X } from "lucide-react";
import styles from "./admin-maintenance-banner.module.css";

type MaintenanceStatus = {
  phase: "idle" | "scheduled" | "active" | string;
  enabled: boolean;
  message: string | null;
  secondsRemaining: number | null;
  scheduledAt: string | null;
  activatedAt: string | null;
};

const authPaths = new Set(["/forgot-password", "/reset-password", "/login"]);

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${minutes}:${String(rem).padStart(2, "0")}`;
}

export function AdminMaintenanceBanner() {
  const pathname = usePathname();
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/platform/maintenance", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return;
      setStatus(((await response.json()) as { data: MaintenanceStatus }).data);
    } catch {
      // Banner is advisory; keep the last known status on transient failures.
    }
  }, []);

  useEffect(() => {
    if (authPaths.has(pathname)) return;
    const timer = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 5_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [load, pathname]);

  useEffect(() => {
    if (!status || status.phase !== "scheduled" || !status.scheduledAt) {
      const idle = window.setTimeout(() => setRemaining(status?.secondsRemaining ?? null), 0);
      return () => window.clearTimeout(idle);
    }
    const ends = Date.parse(status.scheduledAt);
    if (Number.isNaN(ends)) {
      const idle = window.setTimeout(() => setRemaining(status.secondsRemaining), 0);
      return () => window.clearTimeout(idle);
    }
    const tick = () => setRemaining(Math.max(0, Math.ceil((ends - Date.now()) / 1000)));
    const start = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [status]);

  if (authPaths.has(pathname) || !status) return null;

  const scheduled = status.phase === "scheduled" && !status.enabled;
  const active = status.phase === "active" || status.enabled;
  if (!scheduled && !active) return null;

  const noticeKey = `${status.phase}:${status.scheduledAt ?? status.activatedAt ?? "now"}`;
  if (dismissedKey === noticeKey) return null;

  return (
    <aside className={active ? styles.active : styles.scheduled} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden="true"><Construction /></span>
      <div className={styles.copy}>
        <strong>{active ? "Maintenance is active" : "Maintenance countdown running"}</strong>
        <p>
          {active
            ? (status.message || "Consumer traffic is paused. Staff can still use operations.")
            : (status.message || "Warn users to finish work before the window starts.")}
        </p>
        {scheduled && remaining !== null ? (
          <p className={styles.countdown}>Starts in <strong>{formatCountdown(remaining)}</strong></p>
        ) : null}
      </div>
      <div className={styles.actions}>
        <Link href="/maintenance">Open controls</Link>
        <button type="button" aria-label="Dismiss maintenance notice" onClick={() => setDismissedKey(noticeKey)}>
          <X />
        </button>
      </div>
    </aside>
  );
}
