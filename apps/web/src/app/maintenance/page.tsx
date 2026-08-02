"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Construction, Home, RefreshCw } from "lucide-react";
import { BrandMark } from "../../components/brand-mark";
import { maintenanceCountdownClearName } from "../maintenance-countdown-storage";
import styles from "./page.module.css";

type MaintenanceStatus = {
  phase: "idle" | "scheduled" | "active" | string;
  enabled: boolean;
  message: string | null;
  secondsRemaining: number | null;
  scheduledAt: string | null;
};

const SCHEDULE_COPY = "KAILA will pause briefly for maintenance. Please finish what you are doing.";
const ACTIVE_COPY = "We are improving the marketplace. Please check back soon — your jobs and messages will be waiting.";

function isPreStartCopy(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return normalized.includes("finish what you are doing")
    || normalized.includes("will pause briefly")
    || normalized.includes("going into maintenance shortly")
    || normalized.includes("starts soon");
}

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${minutes}:${String(rem).padStart(2, "0")}`;
}

function MaintenancePanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryMessage = searchParams.get("message");
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async (): Promise<MaintenanceStatus | null> => {
    try {
      const response = await fetch("/api/v1/platform/maintenance", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error();
      const body = (await response.json()) as { data: MaintenanceStatus };
      setStatus(body.data);
      setLoadState("ready");
      return body.data;
    } catch {
      setLoadState("error");
      return null;
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!status || (status.phase !== "active" && status.phase !== "scheduled")) return;
    const timer = window.setInterval(() => void load(), 5_000);
    return () => window.clearInterval(timer);
  }, [load, status]);

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

  const phase = status?.phase ?? (queryMessage ? "active" : "loading");
  const active = phase === "active" || status?.enabled === true;
  const scheduled = phase === "scheduled" && !active;
  const idle = phase === "idle" && !status?.enabled;
  const rawMessage = status?.message?.trim() || queryMessage?.trim() || "";
  const message = active
    ? (rawMessage && !isPreStartCopy(rawMessage) ? rawMessage : ACTIVE_COPY)
    : scheduled
      ? (rawMessage || SCHEDULE_COPY)
      : (rawMessage || ACTIVE_COPY);

  return (
    <main className={styles.page}>
      <aside className={styles.hero} aria-hidden="true">
        <div className={styles.heroInner}>
          <BrandMark className={styles.heroBrand} priority variant="onDark" />
          <h2>Local work, pausing only for a moment.</h2>
          <p>
            KAILA is refreshing the marketplace so clients and providers keep a fast,
            trustworthy experience.
          </p>
        </div>
      </aside>

      <section className={styles.content}>
        <div className={styles.panel}>
          <BrandMark className={styles.brand} priority />
          <span className={styles.badge}>
            {idle ? <CheckCircle2 aria-hidden="true" /> : <Construction aria-hidden="true" />}
            {idle ? "Back online" : active ? "Maintenance active" : scheduled ? "Maintenance soon" : "Maintenance"}
          </span>
          <span className={styles.iconWrap} aria-hidden="true">
            {idle ? <CheckCircle2 /> : <Construction />}
          </span>

          {loadState === "loading" ? (
            <>
              <h1 className={styles.title}>Checking KAILA status</h1>
              <span className={styles.skeleton} aria-hidden="true" />
            </>
          ) : null}

          {loadState === "error" ? (
            <>
              <h1 className={styles.title}>KAILA is under maintenance</h1>
              <p className={styles.body}>{message}</p>
            </>
          ) : null}

          {loadState === "ready" && active ? (
            <>
              <h1 className={styles.title}>KAILA is under maintenance</h1>
              <p className={styles.body}>{message}</p>
            </>
          ) : null}

          {loadState === "ready" && scheduled ? (
            <>
              <h1 className={styles.title}>Maintenance starts soon</h1>
              <p className={styles.body}>{message}</p>
              {remaining !== null ? (
                <div className={styles.countdown} aria-live="polite">
                  <span>Starts in</span>
                  <strong>{formatCountdown(remaining)}</strong>
                </div>
              ) : null}
            </>
          ) : null}

          {loadState === "ready" && idle ? (
            <>
              <h1 className={styles.title}>KAILA is back online</h1>
              <p className={styles.body}>Thanks for waiting. You can continue finding and managing local work.</p>
            </>
          ) : null}

          <div className={styles.actions}>
            {idle ? (
              <Link
                className={styles.primary}
                href="/"
                onClick={() => {
                  window.dispatchEvent(new Event(maintenanceCountdownClearName));
                }}
              >
                <Home aria-hidden="true" />
                Continue
              </Link>
            ) : (
              <button
                className={styles.primary}
                type="button"
                onClick={() => {
                  void load().then((next) => {
                    if (next && next.phase === "idle" && !next.enabled) {
                      window.dispatchEvent(new Event(maintenanceCountdownClearName));
                      router.replace("/");
                    }
                  });
                }}
              >
                <RefreshCw aria-hidden="true" />
                Check again
              </button>
            )}
            <Link
              className={styles.secondary}
              href="/"
              onClick={() => {
                window.dispatchEvent(new Event(maintenanceCountdownClearName));
              }}
            >
              Back home
            </Link>
          </div>
          <p className={styles.hint}>Local services near you — KAILA</p>
        </div>
      </section>
    </main>
  );
}

export default function MaintenancePage() {
  return (
    <Suspense fallback={
      <main className={styles.page}>
        <section className={styles.content}>
          <div className={styles.panel}>
            <BrandMark className={styles.brand} priority />
            <h1 className={styles.title}>Checking KAILA status</h1>
          </div>
        </section>
      </main>
    }>
      <MaintenancePanel />
    </Suspense>
  );
}
