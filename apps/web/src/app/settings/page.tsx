"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Clock3,
  Laptop,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { prepareCsrf } from "../auth-client";
import styles from "../account/account.module.css";
import settingsStyles from "./settings.module.css";

type Preferences = {
  muteMessages: boolean;
  muteRoutineReminders: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
};
type Session = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActiveAt: string;
  current: boolean;
};

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [status, setStatus] = useState<
    "loading" | "ready" | "saving" | "error"
  >("loading");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [preferenceResponse, sessionResponse] = await Promise.all([
        fetch("/api/v1/me/notification-preferences", { cache: "no-store" }),
        fetch("/api/v1/me/sessions", { cache: "no-store" }),
      ]);
      if (!preferenceResponse.ok || !sessionResponse.ok) throw new Error();
      setPreferences(
        (
          (await preferenceResponse.json()) as {
            data: Preferences;
          }
        ).data,
      );
      setSessions(
        ((await sessionResponse.json()) as { data: Session[] }).data,
      );
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  async function save() {
    if (!preferences) return;
    setStatus("saving");
    setNotice("");
    try {
      const response = await fetch("/api/v1/me/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...preferences,
          quietHoursStart: preferences.quietHoursStart || null,
          quietHoursEnd: preferences.quietHoursEnd || null,
        }),
      });
      if (!response.ok) throw new Error();
      setPreferences(
        ((await response.json()) as { data: Preferences }).data,
      );
      setNotice("Your notification settings are saved.");
      setStatus("ready");
    } catch {
      setNotice("We couldn’t save your settings. Check the quiet hours.");
      setStatus("error");
    }
  }

  async function revoke(session: Session) {
    if (session.current) return;
    setStatus("saving");
    try {
      const token = await prepareCsrf();
      const response = await fetch(
        `/api/v1/me/sessions/${encodeURIComponent(session.id)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            ...(token ? { "X-XSRF-TOKEN": token } : {}),
          },
        },
      );
      if (!response.ok) throw new Error();
      setSessions((current) =>
        current.filter((item) => item.id !== session.id),
      );
      setNotice("That device has been signed out.");
      setStatus("ready");
    } catch {
      setNotice("We couldn’t sign out that device. Try again.");
      setStatus("error");
    }
  }

  if (status === "loading" && !preferences) {
    return (
      <main className={styles.shell} aria-label="Loading settings">
        <div className={styles.cardSkeleton} />
        <div className={styles.cardSkeleton} />
      </main>
    );
  }

  if (!preferences) {
    return (
      <main className={styles.shell}>
        <Feedback kind="error" title="We couldn’t load Settings">
          Check your connection and try again.
        </Feedback>
        <Button onClick={() => void load()}>Try again</Button>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>PREFERENCES AND SECURITY</p>
          <h1>Settings</h1>
          <p>Control routine alerts and review where your account is signed in.</p>
        </div>
        <Link href="/account">
          <ArrowLeft aria-hidden="true" />
          Account
        </Link>
      </header>

      {notice && (
        <Feedback
          kind={status === "error" ? "error" : "success"}
          title={status === "error" ? "Action needed" : "Settings updated"}
        >
          {notice}
        </Feedback>
      )}

      <section className={`${styles.card} ${settingsStyles.preferences}`}>
        <div className={settingsStyles.sectionTitle}>
          <div>
            <p className={styles.eyebrow}>NOTIFICATIONS</p>
            <h2>Choose what can wait</h2>
          </div>
          <Bell aria-hidden="true" />
        </div>
        <label className={settingsStyles.toggle}>
          <span>
            <MessageCircle aria-hidden="true" />
            <span>
              <strong>Message alerts</strong>
              <small>Mute new-message notifications</small>
            </span>
          </span>
          <input
            checked={preferences.muteMessages}
            onChange={(event) =>
              setPreferences((current) =>
                current
                  ? { ...current, muteMessages: event.target.checked }
                  : current,
              )
            }
            type="checkbox"
          />
        </label>
        <label className={settingsStyles.toggle}>
          <span>
            <Clock3 aria-hidden="true" />
            <span>
              <strong>Routine reminders</strong>
              <small>Mute non-urgent reminders</small>
            </span>
          </span>
          <input
            checked={preferences.muteRoutineReminders}
            onChange={(event) =>
              setPreferences((current) =>
                current
                  ? {
                      ...current,
                      muteRoutineReminders: event.target.checked,
                    }
                  : current,
              )
            }
            type="checkbox"
          />
        </label>
        <div className={settingsStyles.protected}>
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>Always delivered for your safety</strong>
            <p>Security alerts and important job changes cannot be disabled.</p>
          </div>
        </div>
        <fieldset className={settingsStyles.quietHours}>
          <legend>Quiet hours</legend>
          <label>
            Start
            <input
              onChange={(event) =>
                setPreferences((current) =>
                  current
                    ? { ...current, quietHoursStart: event.target.value }
                    : current,
                )
              }
              type="time"
              value={preferences.quietHoursStart || ""}
            />
          </label>
          <label>
            End
            <input
              onChange={(event) =>
                setPreferences((current) =>
                  current
                    ? { ...current, quietHoursEnd: event.target.value }
                    : current,
                )
              }
              type="time"
              value={preferences.quietHoursEnd || ""}
            />
          </label>
        </fieldset>
        <label>
          Timezone
          <select
            onChange={(event) =>
              setPreferences((current) =>
                current
                  ? { ...current, timezone: event.target.value }
                  : current,
              )
            }
            value={preferences.timezone}
          >
            <option value="Asia/Manila">Philippines — Asia/Manila</option>
            <option value="UTC">UTC</option>
          </select>
        </label>
        <Button isLoading={status === "saving"} onClick={() => void save()}>
          Save settings
        </Button>
      </section>

      <section className={`${styles.card} ${settingsStyles.sessions}`}>
        <div className={settingsStyles.sectionTitle}>
          <div>
            <p className={styles.eyebrow}>ACCOUNT SECURITY</p>
            <h2>Signed-in devices</h2>
          </div>
          <LockKeyhole aria-hidden="true" />
        </div>
        {sessions.length ? (
          <div className={settingsStyles.sessionList}>
            {sessions.map((session) => {
              const mobile = /android|iphone|mobile/i.test(
                session.userAgent || "",
              );
              const DeviceIcon = mobile ? Smartphone : Laptop;
              return (
                <article key={session.id}>
                  <span>
                    <DeviceIcon aria-hidden="true" />
                  </span>
                  <div>
                    <strong>
                      {deviceName(session.userAgent)}
                      {session.current && " · This device"}
                    </strong>
                    <small>
                      Last active {new Date(session.lastActiveAt).toLocaleString()}
                      {session.ipAddress && ` · ${session.ipAddress}`}
                    </small>
                  </div>
                  {!session.current && (
                    <Button
                      disabled={status === "saving"}
                      onClick={() => void revoke(session)}
                      variant="secondary"
                    >
                      Sign out
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className={settingsStyles.empty}>
            <Laptop aria-hidden="true" />
            <p>No browser sessions are available to review.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function deviceName(userAgent: string | null): string {
  if (!userAgent) return "Unknown browser";
  if (/iphone|ipad/i.test(userAgent)) return "Safari on iPhone or iPad";
  if (/android/i.test(userAgent)) return "Browser on Android";
  if (/firefox/i.test(userAgent)) return "Firefox";
  if (/edg/i.test(userAgent)) return "Microsoft Edge";
  if (/chrome/i.test(userAgent)) return "Google Chrome";
  if (/safari/i.test(userAgent)) return "Safari";
  return "Web browser";
}
