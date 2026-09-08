"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag, FolderOpen, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@kaila/ui";
import { AdminReasonDialog } from "../../components/admin-dialog";
import {
  AdminEmpty,
  AdminPage,
  AdminPageHeader,
  AdminSkeletons,
  AdminSplit,
  AdminStat,
  AdminStats,
  AdminWorkspace,
} from "../../components/admin-page";
import { prepareCsrf } from "../auth-client";
import { useAdminRealtimeRefresh } from "../admin-realtime";
import styles from "./page.module.css";

type ReportAction = {
  id: string;
  action: string;
  reason: string;
  occurred_at: string;
};

type Report = {
  id: string;
  target_type: string;
  category: string;
  details: string;
  status: string;
  targetSummary?: Record<string, unknown>;
  actions?: ReportAction[];
};

type PendingAction =
  | { kind: "access"; item: Report }
  | { kind: "decision"; outcome: string };

function formatSummaryValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .trim();
}

export default function ReportsPage() {
  const [items, setItems] = useState<Report[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/api/v1/admin/marketplace/reports", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      setItems(((await response.json()) as { data: Report[] }).data);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useAdminRealtimeRefresh(load);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function closeDialog() {
    if (busy) return;
    setPending(null);
    setReason("");
  }

  function requestAccess(item: Report) {
    setPending({ kind: "access", item });
    setReason("");
  }

  function requestDecision(outcome: string) {
    if (!selected) return;
    setPending({ kind: "decision", outcome });
    setReason("");
  }

  async function confirmReason(trimmed: string) {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === "access") {
        const response = await fetch(
          `/api/v1/admin/marketplace/reports/${pending.item.id}?accessReason=${encodeURIComponent(trimmed)}`,
          { credentials: "include" },
        );
        if (!response.ok) {
          setState("error");
          return;
        }
        setSelected(((await response.json()) as { data: Report }).data);
      } else {
        if (!selected) return;
        const token = await prepareCsrf();
        const response = await fetch(
          `/api/v1/admin/marketplace/reports/${selected.id}/decision`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { "X-XSRF-TOKEN": token } : {}),
            },
            body: JSON.stringify({
              outcome: pending.outcome,
              reason: trimmed,
            }),
          },
        );
        if (!response.ok) {
          setState("error");
          return;
        }
        setSelected(null);
        await load();
      }
      setPending(null);
      setReason("");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  const openCount = items.length;
  const summaryEntries = selected?.targetSummary
    ? Object.entries(selected.targetSummary)
    : [];

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <Button
            disabled={state === "loading"}
            onClick={() => void load()}
            type="button"
            variant="secondary"
          >
            <RefreshCw aria-hidden="true" />
            Refresh
          </Button>
        }
        description="Triage safety reports, inspect the reported item, and record proportionate outcomes."
        eyebrow="Operations"
        title="Safety reports"
      />

      <AdminStats label="Report queue summary">
        <AdminStat icon={<Flag aria-hidden="true" />} label="Open reports" value={openCount} />
        <AdminStat
          icon={<FolderOpen aria-hidden="true" />}
          label="Selected report"
          tone={selected ? "default" : "warning"}
          value={selected ? "Open" : "None"}
        />
        <AdminStat
          icon={<ShieldAlert aria-hidden="true" />}
          label="Status"
          tone={state === "error" ? "danger" : "success"}
          value={state === "error" ? "Needs attention" : "Ready"}
        />
      </AdminStats>

      {state === "error" ? (
        <div className={styles.banner} role="alert">
          Reports could not be loaded or updated. Check your connection and try again.
        </div>
      ) : null}

      <AdminWorkspace>
        <AdminSplit>
          <section aria-label="Open reports" className={styles.panel}>
            <div className={styles.panelHeader}>
              <Flag aria-hidden="true" />
              <h2>Open reports</h2>
            </div>

            {state === "loading" ? <AdminSkeletons count={4} label="Loading reports" /> : null}

            {state === "ready" && items.length === 0 ? (
              <AdminEmpty
                description="New safety reports will appear here when users flag marketplace content."
                icon={<Flag aria-hidden="true" />}
                title="No open reports"
              />
            ) : null}

            {state !== "loading" && items.length > 0 ? (
              <div className={styles.list}>
                {items.map((item) => (
                  <article
                    className={`${styles.card} ${selected?.id === item.id ? styles.cardActive : ""}`}
                    key={item.id}
                  >
                    <h3>{item.category.replaceAll("_", " ")}</h3>
                    <p>{item.details}</p>
                    <small>{item.target_type.replaceAll("_", " ")}</small>
                    <div className={styles.actions}>
                      <Button onClick={() => requestAccess(item)} type="button" variant="primary">
                        Review report
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>

          <section aria-label="Reported item" className={styles.panel}>
            <div className={styles.panelHeader}>
              <ShieldAlert aria-hidden="true" />
              <h2>Reported item</h2>
            </div>

            {!selected ? (
              <div className={styles.placeholder}>
                <Flag aria-hidden="true" />
                <h3>Select a report to review</h3>
                <p>Access requires a recorded reason before target details are shown.</p>
              </div>
            ) : (
              <div className={styles.detail}>
                <div className={styles.detailIntro}>
                  <h3>{selected.target_type.replaceAll("_", " ")}</h3>
                  <p>{selected.details}</p>
                </div>

                {summaryEntries.length > 0 ? (
                  <div>
                    <p className={styles.sectionLabel}>Target summary</p>
                    <dl className={styles.summary}>
                      {summaryEntries.map(([key, value]) => (
                        <div className={styles.summaryRow} key={key}>
                          <dt>{formatKey(key)}</dt>
                          <dd>{formatSummaryValue(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}

                {selected.actions && selected.actions.length > 0 ? (
                  <div className={styles.history}>
                    <p className={styles.sectionLabel}>Action history</p>
                    {selected.actions.map((action) => (
                      <div className={styles.historyItem} key={action.id}>
                        <strong>{action.action.replaceAll("_", " ")}</strong>
                        <p>{action.reason}</p>
                        <small>{new Date(action.occurred_at).toLocaleString()}</small>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className={styles.actions}>
                  <Button
                    onClick={() => requestDecision("no_action")}
                    type="button"
                    variant="secondary"
                  >
                    No action
                  </Button>
                  <Button
                    onClick={() => requestDecision("warning")}
                    type="button"
                    variant="secondary"
                  >
                    Record warning
                  </Button>
                  <Button
                    onClick={() => requestDecision("content_removed")}
                    type="button"
                    variant="danger"
                  >
                    Remove content
                  </Button>
                  <Button
                    onClick={() => requestDecision("account_restricted")}
                    type="button"
                    variant="danger"
                  >
                    Restrict account
                  </Button>
                </div>
              </div>
            )}
          </section>
        </AdminSplit>
      </AdminWorkspace>

      <AdminReasonDialog
        busy={busy}
        confirmLabel={pending?.kind === "decision" ? "Record outcome" : "Open report"}
        confirmVariant={
          pending?.kind === "decision" &&
          (pending.outcome === "content_removed" || pending.outcome === "account_restricted")
            ? "danger"
            : "primary"
        }
        description={
          pending?.kind === "decision"
            ? "Explain the evidence-based reason for this safety outcome. This becomes part of the audit trail."
            : "Explain why you need access to this safety report. Access is logged for compliance."
        }
        eyebrow={pending?.kind === "decision" ? "Decision reason" : "Access reason"}
        onClose={closeDialog}
        onConfirm={confirmReason}
        onReasonChange={setReason}
        open={pending !== null}
        reason={reason}
        reasonLabel="Reason"
        title={
          pending?.kind === "decision"
            ? "Confirm report outcome"
            : "Record report access"
        }
      />
    </AdminPage>
  );
}
