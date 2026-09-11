"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Mail,
  RefreshCw,
  Smartphone,
  XCircle,
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
import { prepareCsrf } from "../auth-client";
import { useAdminRealtimeRefresh } from "../admin-realtime";
import styles from "./page.module.css";

type Item = {
  id: string;
  name: string;
  email: string;
  note: string | null;
  status: "pending" | "invited" | "dismissed";
  submittedAt: string | null;
  invitedAt: string | null;
  invitedBy: { id: string; name: string } | null;
};

type Data = {
  items: Item[];
  summary: {
    pending: number;
    invited: number;
    dismissed: number;
  };
};

type Filter = "pending" | "invited" | "dismissed" | "all";

function EarlyAccessWorkspace() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("request");
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState<Filter>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const query = `?status=${filter}`;
      const response = await fetch(
        `/api/v1/admin/marketplace/android-internal-test-requests${query}`,
        { credentials: "include", cache: "no-store" },
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

  const items = useMemo(() => {
    if (!data) return [];
    if (!focusId) return data.items;
    return [...data.items].sort((a, b) => Number(b.id === focusId) - Number(a.id === focusId));
  }, [data, focusId]);

  async function invite(item: Item) {
    setBusyId(item.id);
    setMessage(null);
    try {
      const token = await prepareCsrf();
      const response = await fetch(
        `/api/v1/admin/marketplace/android-internal-test-requests/${encodeURIComponent(item.id)}/invite`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            ...(token ? { "X-XSRF-TOKEN": token } : {}),
          },
        },
      );
      if (!response.ok) throw new Error();
      setMessage(`Invite sent to ${item.email}.`);
      await load();
    } catch {
      setMessage("Could not send the invite. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function setStatus(item: Item, status: "pending" | "dismissed") {
    setBusyId(item.id);
    setMessage(null);
    try {
      const token = await prepareCsrf();
      const response = await fetch(
        `/api/v1/admin/marketplace/android-internal-test-requests/${encodeURIComponent(item.id)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { "X-XSRF-TOKEN": token } : {}),
          },
          body: JSON.stringify({ status }),
        },
      );
      if (!response.ok) throw new Error();
      await load();
    } catch {
      setMessage("Could not update that request.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Android testing"
        title="Early access"
        description="Requests from kaila-app.com/#download for Google Play internal testing."
        actions={
          <Button
            type="button"
            variant="secondary"
            disabled={state === "loading"}
            isLoading={state === "loading"}
            onClick={() => void load()}
          >
            <RefreshCw aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      <AdminStats label="Early access summary">
        <AdminStat
          icon={<Clock3 aria-hidden="true" />}
          label="Pending"
          value={data?.summary.pending ?? "—"}
        />
        <AdminStat
          icon={<CheckCircle2 aria-hidden="true" />}
          label="Invited"
          tone="success"
          value={data?.summary.invited ?? "—"}
        />
        <AdminStat
          icon={<XCircle aria-hidden="true" />}
          label="Dismissed"
          tone="warning"
          value={data?.summary.dismissed ?? "—"}
        />
      </AdminStats>

      <AdminWorkspace className={styles.workspace}>
        <header className={styles.workspaceHeader}>
          <div>
            <h2>Request queue</h2>
            <p>Invite sends the branded Play tester email and marks the request as invited.</p>
          </div>
          <div className={styles.filters} role="group" aria-label="Filter requests">
            {(["pending", "invited", "dismissed", "all"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {message ? (
          <p className={styles.message} role="status">
            {message}
          </p>
        ) : null}

        {state === "loading" ? <AdminSkeletons count={4} label="Loading early access requests" /> : null}
        {state === "error" ? (
          <AdminEmpty
            icon={<Smartphone aria-hidden="true" />}
            title="Couldn’t load early access requests"
            description="Refresh and try again."
            action={
              <Button type="button" onClick={() => void load()}>
                Try again
              </Button>
            }
          />
        ) : null}
        {state === "ready" && items.length === 0 ? (
          <AdminEmpty
            icon={<Mail aria-hidden="true" />}
            title="No requests in this view"
            description="New form submissions from the marketing download section appear here."
          />
        ) : null}

        {state === "ready" && items.length > 0 ? (
          <div className={styles.list}>
            {items.map((item) => (
              <article
                key={item.id}
                className={focusId === item.id ? styles.focused : undefined}
                data-request-id={item.id}
              >
                <span
                  className={
                    item.status === "invited"
                      ? styles.doneIcon
                      : item.status === "dismissed"
                        ? styles.blockIcon
                        : styles.pendingIcon
                  }
                >
                  {item.status === "invited" ? (
                    <CheckCircle2 aria-hidden="true" />
                  ) : item.status === "dismissed" ? (
                    <XCircle aria-hidden="true" />
                  ) : (
                    <Clock3 aria-hidden="true" />
                  )}
                </span>
                <div className={styles.copy}>
                  <h3>{item.name}</h3>
                  <p>
                    <a href={`mailto:${item.email}`}>{item.email}</a>
                    {item.submittedAt ? ` · ${new Date(item.submittedAt).toLocaleString()}` : null}
                  </p>
                  {item.note ? <p className={styles.note}>{item.note}</p> : null}
                  {item.status === "invited" && item.invitedBy ? (
                    <p className={styles.meta}>
                      Invited by {item.invitedBy.name}
                      {item.invitedAt ? ` · ${new Date(item.invitedAt).toLocaleString()}` : null}
                    </p>
                  ) : null}
                  <div className={styles.actions}>
                    {item.status === "pending" ? (
                      <>
                        <Button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void invite(item)}
                        >
                          Send invite
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busyId === item.id}
                          onClick={() => void setStatus(item, "dismissed")}
                        >
                          Dismiss
                        </Button>
                      </>
                    ) : null}
                    {item.status === "dismissed" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busyId === item.id}
                        onClick={() => void setStatus(item, "pending")}
                      >
                        Reopen
                      </Button>
                    ) : null}
                    {item.status === "invited" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busyId === item.id}
                        onClick={() => void invite(item)}
                      >
                        Resend invite
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </AdminWorkspace>
    </AdminPage>
  );
}

export default function EarlyAccessPage() {
  return (
    <Suspense
      fallback={
        <AdminPage>
          <AdminPageHeader
            eyebrow="Android testing"
            title="Early access"
            description="Loading early access requests…"
          />
          <AdminSkeletons count={4} label="Loading early access requests" />
        </AdminPage>
      }
    >
      <EarlyAccessWorkspace />
    </Suspense>
  );
}
