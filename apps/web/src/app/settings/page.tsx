"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Clock3,
  Laptop,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Monitor,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
} from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { prepareCsrf } from "../auth-client";
import { clearSession } from "@kaila/mobile/session";
import styles from "../account/account.module.css";
import settingsStyles from "./settings.module.css";
import { useTheme } from "../theme-provider";
import type { ThemePreference } from "../theme";
import { SelectField } from "../../components/select-field";

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
type SessionGroup = {
  id: string;
  sessions: Session[];
};

export default function SettingsPage() {
  const router = useRouter();
  const { preference, setPreference, syncStatus } = useTheme();
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

  async function revoke(sessionGroup: SessionGroup) {
    const revocableSessions = sessionGroup.sessions.filter((session) => !session.current);
    if (!revocableSessions.length) return;
    setStatus("saving");
    setNotice("");
    try {
      const token = await prepareCsrf();
      await Promise.all(
        revocableSessions.map(async (session) => {
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
        }),
      );
      const revokedIds = new Set(revocableSessions.map((session) => session.id));
      setSessions((current) =>
        current.filter((item) => !revokedIds.has(item.id)),
      );
      setNotice(revocableSessions.length === 1
        ? "That session has been signed out."
        : "Those sessions have been signed out.");
      setStatus("ready");
    } catch {
      setNotice("We couldn’t sign out those sessions. Refresh and try again.");
      setStatus("error");
    }
  }

  async function signOutCurrentDevice() {
    setStatus("saving");
    setNotice("");
    try {
      const token = await prepareCsrf();
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
      });
      await clearSession().catch(() => undefined);
    } finally {
      router.replace("/login");
      router.refresh();
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
    <main className={`${styles.shell} ${settingsStyles.shell}`}>
      <header className={settingsStyles.pageHeader}>
        <Link className={settingsStyles.backLink} href="/account">
          <ArrowLeft aria-hidden="true" />
          Account
        </Link>
        <div>
          <p className={styles.eyebrow}>PREFERENCES AND SECURITY</p>
          <h1>Settings</h1>
          <p>Control appearance, routine alerts, and where your account is signed in.</p>
        </div>
      </header>

      {notice && (
        <Feedback
          kind={status === "error" ? "error" : "success"}
          title={status === "error" ? "Action needed" : "Settings updated"}
        >
          {notice}
        </Feedback>
      )}

      <section className={`${styles.card} ${settingsStyles.preferences}`} aria-label="Appearance">
        <div className={settingsStyles.sectionTitle}>
          <div>
            <p className={styles.eyebrow}>APPEARANCE</p>
            <h2>Light, dark, or system</h2>
          </div>
          <Monitor aria-hidden="true" />
        </div>
        <p className={settingsStyles.appearanceHint}>
          Your choice syncs with your KAILA account on every device you sign in to.
        </p>
        <div className={settingsStyles.themeOptions} role="radiogroup" aria-label="Theme">
          {([
            { id: "light", label: "Light", icon: Sun },
            { id: "dark", label: "Dark", icon: Moon },
            { id: "system", label: "System", icon: Monitor },
          ] as const).map((option) => {
            const Icon = option.icon;
            const selected = preference === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={selected ? settingsStyles.themeOptionActive : settingsStyles.themeOption}
                onClick={() => void setPreference(option.id as ThemePreference)}
              >
                <Icon aria-hidden="true" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
        {syncStatus === "saving" && <p className={settingsStyles.appearanceStatus}>Saving to your account…</p>}
        {syncStatus === "error" && (
          <p className={settingsStyles.appearanceStatusError}>
            Couldn’t save appearance. Your selection stays on this device until sync succeeds.
          </p>
        )}
      </section>

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
              <strong>Mute message alerts</strong>
              <small>Pause notifications for new messages</small>
            </span>
          </span>
          <input
            checked={preferences.muteMessages}
            disabled={status === "saving"}
            onChange={(event) =>
              setPreferences((current) =>
                current
                  ? { ...current, muteMessages: event.target.checked }
                  : current,
              )
            }
            role="switch"
            type="checkbox"
          />
          <span className={settingsStyles.switchControl} aria-hidden="true">
            <span className={settingsStyles.switchThumb} />
          </span>
        </label>
        <label className={settingsStyles.toggle}>
          <span>
            <Clock3 aria-hidden="true" />
            <span>
              <strong>Mute routine reminders</strong>
              <small>Pause non-urgent reminders</small>
            </span>
          </span>
          <input
            checked={preferences.muteRoutineReminders}
            disabled={status === "saving"}
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
            role="switch"
            type="checkbox"
          />
          <span className={settingsStyles.switchControl} aria-hidden="true">
            <span className={settingsStyles.switchThumb} />
          </span>
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
          <SelectField
            label="Timezone"
            onChange={(timezone) =>
              setPreferences((current) =>
                current
                  ? { ...current, timezone }
                  : current,
              )
            }
            value={preferences.timezone}
            options={[{value:"Asia/Manila",label:"Philippines — Asia/Manila"},{value:"UTC",label:"UTC"}]}
          />
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
            {groupSessions(sessions).map((sessionGroup) => {
              const currentSession = sessionGroup.sessions.find((session) => session.current);
              const session = currentSession || sessionGroup.sessions[0];
              const latestSession = sessionGroup.sessions[0];
              const revocableCount = sessionGroup.sessions.filter((item) => !item.current).length;
              const mobile = /android|iphone|mobile/i.test(
                session.userAgent || "",
              );
              const DeviceIcon = mobile ? Smartphone : Laptop;
              return (
                <article key={sessionGroup.id}>
                  <span>
                    <DeviceIcon aria-hidden="true" />
                  </span>
                  <div>
                    <strong>
                      {deviceName(session.userAgent)}
                      {currentSession && " · This device"}
                    </strong>
                    <small>
                      {sessionGroup.sessions.length > 1 && `${sessionGroup.sessions.length} sessions · `}
                      Last active {new Date(latestSession.lastActiveAt).toLocaleString()}
                      {latestSession.ipAddress && ` · ${latestSession.ipAddress}`}
                    </small>
                  </div>
                  {revocableCount > 0 && (
                    <Button
                      disabled={status === "saving"}
                      onClick={() => void revoke(sessionGroup)}
                      variant="secondary"
                    >
                      {currentSession
                        ? "Sign out others"
                        : sessionGroup.sessions.length > 1
                          ? "Sign out all"
                          : "Sign out"}
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

      <section className={`${styles.card} ${settingsStyles.signOutCard}`}>
        <span>
          <LogOut aria-hidden="true" />
        </span>
        <div>
          <h2>Sign out of this device</h2>
          <p>Your account and activity will remain safe.</p>
        </div>
        <Button
          disabled={status === "saving"}
          onClick={() => void signOutCurrentDevice()}
          variant="secondary"
        >
          Sign out
        </Button>
      </section>
      <Link className={`${styles.card} ${settingsStyles.deleteCard}`} href="/account-deletion">
        <span><Trash2 aria-hidden="true" /></span>
        <div><h2>Delete your account</h2><p>Review what is removed and permanently close your account.</p></div>
        <span className={settingsStyles.deleteAction}>Review deletion</span>
      </Link>
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

function groupSessions(sessions: Session[]): SessionGroup[] {
  const grouped = new Map<string, Session[]>();

  sessions.forEach((session) => {
    const key = `${deviceName(session.userAgent)}\u0000${session.ipAddress || "unknown"}`;
    grouped.set(key, [...(grouped.get(key) || []), session]);
  });

  return Array.from(grouped.values())
    .map((groupedSessions) => ({
      id: groupedSessions[0].id,
      sessions: groupedSessions,
    }))
    .sort((left, right) =>
      Number(right.sessions.some((session) => session.current))
      - Number(left.sessions.some((session) => session.current)),
    );
}
