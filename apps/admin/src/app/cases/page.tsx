"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileCheck2,
  FolderOpen,
  RefreshCw,
  Scale,
  ShieldAlert,
} from "lucide-react";
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

type Evidence = {
  id: string;
  original_name: string | null;
  scan_status: string | null;
  note: string | null;
};

type Action = {
  id: string;
  action: string;
  reason: string;
  target_state: string | null;
  occurred_at: string;
};

type Case = {
  id: string;
  reason: string;
  status: string;
  evidence_count?: number;
  resume_state: string;
  assigned_to_user_id: number | null;
  evidence?: Evidence[];
  actions?: Action[];
};

type PendingAction =
  | { kind: "access"; item: Case }
  | { kind: "decision"; targetState: string };

export default function CasesPage() {
  const [items, setItems] = useState<Case[]>([]);
  const [selected, setSelected] = useState<Case | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/api/v1/admin/marketplace/cases", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      setItems(((await response.json()) as { data: Case[] }).data);
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

  function requestAccess(item: Case) {
    setPending({ kind: "access", item });
    setReason("");
  }

  function requestDecision(targetState: string) {
    if (!selected) return;
    setPending({ kind: "decision", targetState });
    setReason("");
  }

  async function confirmReason(trimmed: string) {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === "access") {
        const response = await fetch(
          `/api/v1/admin/marketplace/cases/${pending.item.id}?accessReason=${encodeURIComponent(trimmed)}`,
          { credentials: "include" },
        );
        if (!response.ok) {
          setState("error");
          return;
        }
        setSelected(((await response.json()) as { data: Case }).data);
      } else {
        if (!selected) return;
        const token = await prepareCsrf();
        const response = await fetch(
          `/api/v1/admin/marketplace/cases/${selected.id}/decision`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { "X-XSRF-TOKEN": token } : {}),
            },
            body: JSON.stringify({
              targetState: pending.targetState,
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
  const withEvidence = items.filter((item) => (item.evidence_count ?? 0) > 0).length;

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
        description="Review dispute evidence, record access, and decide outcomes with a clear audit trail."
        eyebrow="Operations"
        title="Dispute casework"
      />

      <AdminStats label="Case queue summary">
        <AdminStat icon={<Scale aria-hidden="true" />} label="Active disputes" value={openCount} />
        <AdminStat
          icon={<FileCheck2 aria-hidden="true" />}
          label="With evidence"
          tone="success"
          value={withEvidence}
        />
        <AdminStat
          icon={<FolderOpen aria-hidden="true" />}
          label="Selected case"
          tone={selected ? "default" : "warning"}
          value={selected ? "Open" : "None"}
        />
      </AdminStats>

      {state === "error" ? (
        <div className={styles.banner} role="alert">
          Cases could not be loaded or updated. Check your connection and try again.
        </div>
      ) : null}

      <AdminWorkspace>
        <AdminSplit>
          <section aria-label="Active disputes" className={styles.panel}>
            <div className={styles.panelHeader}>
              <Scale aria-hidden="true" />
              <h2>Active disputes</h2>
            </div>

            {state === "loading" ? <AdminSkeletons count={4} label="Loading cases" /> : null}

            {state === "ready" && items.length === 0 ? (
              <AdminEmpty
                description="New dispute cases will appear here when marketplace jobs need intervention."
                icon={<Scale aria-hidden="true" />}
                title="No active disputes"
              />
            ) : null}

            {state !== "loading" && items.length > 0 ? (
              <div className={styles.list}>
                {items.map((item) => (
                  <article
                    className={`${styles.card} ${selected?.id === item.id ? styles.cardActive : ""}`}
                    key={item.id}
                  >
                    <h3>{item.status.replaceAll("_", " ")}</h3>
                    <p>{item.reason}</p>
                    <small>
                      {item.evidence_count ?? 0} evidence item
                      {(item.evidence_count ?? 0) === 1 ? "" : "s"}
                    </small>
                    <div className={styles.actions}>
                      <Button onClick={() => requestAccess(item)} type="button" variant="primary">
                        Review case
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>

          <section aria-label="Case evidence and history" className={styles.panel}>
            <div className={styles.panelHeader}>
              <FileCheck2 aria-hidden="true" />
              <h2>Case evidence and history</h2>
            </div>

            {!selected ? (
              <div className={styles.placeholder}>
                <ShieldAlert aria-hidden="true" />
                <h3>Select a case to review</h3>
                <p>Access requires a recorded reason before evidence is shown.</p>
              </div>
            ) : (
              <div className={styles.detail}>
                <div className={styles.detailIntro}>
                  <h3>Requested review</h3>
                  <p>{selected.reason}</p>
                </div>

                {selected.evidence && selected.evidence.length > 0 ? (
                  <div className={styles.evidence}>
                    <p className={styles.sectionLabel}>Evidence</p>
                    {selected.evidence.map((evidence) => (
                      <div className={styles.evidenceItem} key={evidence.id}>
                        <FileCheck2 aria-hidden="true" />
                        <span>
                          {evidence.scan_status === "clean" ? (
                            <a
                              href={`/api/v1/dispute-evidence/${evidence.id}`}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {evidence.original_name || "Evidence note"}
                            </a>
                          ) : (
                            evidence.original_name || evidence.note || "Evidence item"
                          )}
                        </span>
                        <small>{evidence.scan_status ?? "pending"}</small>
                      </div>
                    ))}
                  </div>
                ) : null}

                {selected.actions && selected.actions.length > 0 ? (
                  <div className={styles.history}>
                    <p className={styles.sectionLabel}>Decision history</p>
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
                    onClick={() => requestDecision(selected.resume_state)}
                    type="button"
                    variant="secondary"
                  >
                    Resume prior stage
                  </Button>
                  <Button
                    onClick={() => requestDecision("revision_requested")}
                    type="button"
                    variant="secondary"
                  >
                    Require correction
                  </Button>
                  <Button
                    onClick={() => requestDecision("completed")}
                    type="button"
                    variant="primary"
                  >
                    Confirm completed
                  </Button>
                  <Button
                    onClick={() => requestDecision("cancelled")}
                    type="button"
                    variant="danger"
                  >
                    Cancel job
                  </Button>
                </div>
              </div>
            )}
          </section>
        </AdminSplit>
      </AdminWorkspace>

      <AdminReasonDialog
        busy={busy}
        confirmLabel={pending?.kind === "decision" ? "Record decision" : "Open case"}
        confirmVariant={
          pending?.kind === "decision" && pending.targetState === "cancelled"
            ? "danger"
            : "primary"
        }
        description={
          pending?.kind === "decision"
            ? "Explain the evidence-based reason for this case decision. This becomes part of the audit trail."
            : "Explain why you need access to this dispute case. Access is logged for compliance."
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
            ? "Confirm case decision"
            : "Record case access"
        }
      />
    </AdminPage>
  );
}
