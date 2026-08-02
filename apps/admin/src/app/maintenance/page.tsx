"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  CheckCircle2,
  Construction,
  Power,
  PowerOff,
  RefreshCw,
  TimerReset,
} from "lucide-react";
import { prepareCsrf } from "../auth-client";
import { OperationsHeader } from "../components/operations-header";
import styles from "./page.module.css";

type MaintenanceData = {
  phase: "idle" | "scheduled" | "active";
  enabled: boolean;
  message: string | null;
  countdownSeconds: number | null;
  secondsRemaining: number | null;
  scheduledAt: string | null;
  activatedAt: string | null;
  capabilities: { canManageMaintenance: boolean };
};

const PRESETS = [
  { label: "1 minute", seconds: 60 },
  { label: "5 minutes", seconds: 300 },
  { label: "15 minutes", seconds: 900 },
  { label: "30 minutes", seconds: 1800 },
];

function formatRemaining(seconds: number | null): string {
  if (seconds === null) return "—";
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${minutes}:${String(rem).padStart(2, "0")}`;
}

export default function MaintenancePage() {
  const [data, setData] = useState<MaintenanceData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [countdownSeconds, setCountdownSeconds] = useState(300);
  const [message, setMessage] = useState(
    "KAILA will pause briefly for maintenance. Please finish what you are doing.",
  );

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/api/v1/admin/marketplace/maintenance", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      setData(((await response.json()) as { data: MaintenanceData }).data);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!data || data.phase !== "scheduled" || !data.scheduledAt) {
      const idle = window.setTimeout(() => {
        setRemaining(data?.secondsRemaining ?? null);
      }, 0);
      return () => window.clearTimeout(idle);
    }
    const ends = Date.parse(data.scheduledAt);
    if (Number.isNaN(ends)) {
      const idle = window.setTimeout(() => setRemaining(data.secondsRemaining), 0);
      return () => window.clearTimeout(idle);
    }
    const tick = () => setRemaining(Math.max(0, Math.ceil((ends - Date.now()) / 1000)));
    const start = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [data]);

  async function post(path: string, body?: object) {
    setBusy(true);
    setNotice("");
    try {
      const token = await prepareCsrf();
      const response = await fetch(`/api/v1/admin/marketplace/maintenance/${path}`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = (await response.json()) as { data?: MaintenanceData; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Request failed.");
      if (payload.data) setData((current) => current ? { ...current, ...payload.data, capabilities: current.capabilities } : null);
      setNotice("Maintenance controls updated.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function schedule(event: FormEvent) {
    event.preventDefault();
    await post("schedule", { countdownSeconds, message });
  }

  return (
    <main className={styles.page}>
      <section className={styles.brandHero} aria-label="KAILA maintenance">
        <Image
          alt="KAILA"
          className={styles.brandMark}
          height={248}
          priority
          src="/brand/kaila-wordmark-on-dark.png"
          width={1102}
        />
        <div>
          <p>PLATFORM CONTROL</p>
          <h1>Maintenance</h1>
          <span>Warn every connected user with a countdown toast, then pause consumer traffic on the branded KAILA maintenance page.</span>
        </div>
      </section>

      <OperationsHeader
        eyebrow="LIVE WINDOW"
        title="Schedule and control"
        description="Connected users see /maintenance with live countdown. Staff keep access to this operations console."
        actions={
          <button type="button" onClick={() => void load()} disabled={state === "loading"}>
            <RefreshCw className={state === "loading" ? styles.spinner : undefined} /> Refresh
          </button>
        }
      />

      {state === "error" ? (
        <section className={styles.error}>
          <AlertCircle aria-hidden="true" />
          <div>
            <h3>Could not load maintenance status</h3>
            <p>Check your staff session and try again.</p>
            <button type="button" onClick={() => void load()}>Retry</button>
          </div>
        </section>
      ) : null}

      {state === "loading" && !data ? (
        <div className={styles.skeletons} aria-busy="true">
          <span /><span /><span />
        </div>
      ) : null}

      {data ? (
        <>
          <section className={styles.stats} aria-label="Maintenance status">
            <article className={data.phase === "active" ? styles.blocked : data.phase === "scheduled" ? styles.completed : undefined}>
              <span><Construction aria-hidden="true" /></span>
              <div>
                <strong>{data.phase === "active" ? "Active" : data.phase === "scheduled" ? "Scheduled" : "Idle"}</strong>
                <p>Current platform phase</p>
              </div>
            </article>
            <article>
              <span><TimerReset aria-hidden="true" /></span>
              <div>
                <strong>{formatRemaining(remaining)}</strong>
                <p>Countdown remaining</p>
              </div>
            </article>
            <article>
              <span>{data.enabled ? <Power aria-hidden="true" /> : <PowerOff aria-hidden="true" />}</span>
              <div>
                <strong>{data.enabled ? "Consumer blocked" : "Consumer open"}</strong>
                <p>API maintenance gate</p>
              </div>
            </article>
          </section>

          {notice ? <p className={styles.notice} role="status">{notice}</p> : null}

          <section className={styles.createCard}>
            <header>
              <h2><Construction aria-hidden="true" /> Schedule maintenance</h2>
              <p>Connected users receive a persistent toast with a live countdown before activation.</p>
            </header>
            {!data.capabilities.canManageMaintenance ? (
              <p className={styles.muted}>Your role can view maintenance status but cannot change it.</p>
            ) : (
              <form className={styles.createForm} onSubmit={(event) => void schedule(event)}>
                <label>
                  Countdown
                  <select
                    value={countdownSeconds}
                    onChange={(event) => setCountdownSeconds(Number(event.target.value))}
                  >
                    {PRESETS.map((preset) => (
                      <option key={preset.seconds} value={preset.seconds}>{preset.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Custom seconds
                  <input
                    type="number"
                    min={5}
                    max={3600}
                    value={countdownSeconds}
                    onChange={(event) => setCountdownSeconds(Number(event.target.value))}
                  />
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  Countdown toast message
                  <input
                    value={message}
                    maxLength={500}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                </label>
                <p className={styles.muted} style={{ gridColumn: "1 / -1", margin: 0 }}>
                  After maintenance starts, users see an “under maintenance / check back soon” message instead of this countdown copy.
                </p>
                <button type="submit" disabled={busy || data.phase === "active"}>
                  <TimerReset /> Start countdown
                </button>
              </form>
            )}
          </section>

          <section className={styles.workspace}>
            <header>
              <div>
                <h2>Actions</h2>
                <p>Cancel a countdown, activate immediately, or restore the marketplace.</p>
              </div>
            </header>
            <div className={styles.actions} style={{ padding: "0 var(--spacing-24) var(--spacing-24)" }}>
              <button
                type="button"
                disabled={busy || !data.capabilities.canManageMaintenance || data.phase !== "scheduled"}
                onClick={() => void post("cancel")}
              >
                <PowerOff /> Cancel countdown
              </button>
              <button
                type="button"
                disabled={busy || !data.capabilities.canManageMaintenance || data.phase === "active"}
                onClick={() => void post("activate")}
              >
                <Power /> Activate now
              </button>
              <button
                type="button"
                className={styles.danger}
                disabled={busy || !data.capabilities.canManageMaintenance || data.phase === "idle"}
                onClick={() => void post("end")}
              >
                <CheckCircle2 /> End maintenance
              </button>
            </div>
            {data.message ? (
              <p className={styles.muted} style={{ padding: "0 var(--spacing-24) var(--spacing-24)" }}>
                Active message: {data.message}
              </p>
            ) : null}
          </section>
        </>
      ) : null}
    </main>
  );
}
