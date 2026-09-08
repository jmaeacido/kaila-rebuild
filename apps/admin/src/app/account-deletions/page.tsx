"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
  UserRoundX,
} from "lucide-react";
import { Button } from "@kaila/ui";
import {
  AdminEmpty,
  AdminPage,
  AdminPageHeader,
  AdminSkeletons,
  AdminStat,
  AdminStats,
  AdminWorkspace,
} from "../../components/admin-page";
import { useAdminRealtimeRefresh } from "../admin-realtime";
import styles from "./page.module.css";

type Item = {
  id: string;
  reference: string;
  outcome: "completed" | "blocked";
  blockers: { code: string; title: string }[];
  requestedAt: string;
  completedAt: string | null;
};

type Data = {
  items: Item[];
  summary: {
    completed: number;
    blocked: number;
    lastCompletedAt: string | null;
  };
  pagination: {
    currentPage: number;
    lastPage: number;
    total: number;
  };
};

type Filter = "all" | "completed" | "blocked";

export default function AccountDeletionsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const query = filter === "all" ? "" : `?outcome=${filter}`;
      const response = await fetch(
        `/api/v1/admin/marketplace/account-deletions${query}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );
      if (!response.ok) throw new Error();
      setData(((await response.json()) as { data: Data }).data);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [filter]);

  useAdminRealtimeRefresh(load);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <Button
            disabled={state === "loading"}
            isLoading={state === "loading"}
            onClick={() => void load()}
            type="button"
            variant="secondary"
          >
            <RefreshCw aria-hidden="true" />
            Refresh
          </Button>
        }
        description="A privacy-safe operational record of deletion outcomes. Personal identity is never displayed after erasure."
        eyebrow="Privacy operations"
        title="Account deletion trail"
      />

      <AdminStats label="Deletion summary">
        <AdminStat
          icon={<CheckCircle2 aria-hidden="true" />}
          label="Completed deletions"
          tone="success"
          value={data?.summary.completed ?? "—"}
        />
        <AdminStat
          icon={<AlertCircle aria-hidden="true" />}
          label="Blocked attempts"
          tone="warning"
          value={data?.summary.blocked ?? "—"}
        />
        <AdminStat
          icon={<Clock3 aria-hidden="true" />}
          label="Last completed"
          value={
            data?.summary.lastCompletedAt
              ? new Date(data.summary.lastCompletedAt).toLocaleDateString()
              : "None yet"
          }
        />
      </AdminStats>

      <AdminWorkspace className={styles.workspace}>
        <header className={styles.workspaceHeader}>
          <div>
            <h2>Deletion activity</h2>
            <p>References are anonymous and safe for operational follow-up.</p>
          </div>
          <div
            aria-label="Filter deletion activity"
            className={styles.filters}
            role="group"
          >
            {(["all", "completed", "blocked"] as const).map((value) => (
              <button
                aria-pressed={filter === value}
                key={value}
                onClick={() => setFilter(value)}
                type="button"
              >
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {state === "loading" ? (
          <AdminSkeletons count={3} label="Loading deletion activity" />
        ) : null}

        {state === "error" ? (
          <div className={styles.error} role="alert">
            <AlertCircle aria-hidden="true" />
            <div>
              <h3>Deletion activity is unavailable</h3>
              <p>Check the API connection and try again.</p>
              <Button onClick={() => void load()} type="button" variant="secondary">
                Try again
              </Button>
            </div>
          </div>
        ) : null}

        {state === "ready" && data?.items.length === 0 ? (
          <AdminEmpty
            description="New completed or blocked deletion attempts will appear here."
            icon={<UserRoundX aria-hidden="true" />}
            title="No deletion activity"
          />
        ) : null}

        {state === "ready" && data && data.items.length > 0 ? (
          <div className={styles.list}>
            {data.items.map((item) => (
              <article key={item.id}>
                <span
                  className={
                    item.outcome === "completed" ? styles.doneIcon : styles.blockIcon
                  }
                >
                  {item.outcome === "completed" ? (
                    <CheckCircle2 aria-hidden="true" />
                  ) : (
                    <ShieldCheck aria-hidden="true" />
                  )}
                </span>
                <div className={styles.record}>
                  <div>
                    <h3>{item.reference}</h3>
                    <span
                      className={
                        item.outcome === "completed"
                          ? styles.doneBadge
                          : styles.blockBadge
                      }
                    >
                      {item.outcome}
                    </span>
                  </div>
                  <p>Requested {new Date(item.requestedAt).toLocaleString()}</p>
                  {item.blockers.length > 0 ? (
                    <ul>
                      {item.blockers.map((blocker) => (
                        <li key={blocker.code}>{blocker.title}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <time>
                  {item.completedAt
                    ? `Completed ${new Date(item.completedAt).toLocaleString()}`
                    : "Not processed"}
                </time>
              </article>
            ))}
          </div>
        ) : null}
      </AdminWorkspace>
    </AdminPage>
  );
}
