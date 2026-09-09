"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Images, RefreshCw, ScanFace, X } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { AdminPageHeader, AdminSkeletons } from "../../components/admin-page";
import { publishAdminRealtime, useAdminRealtimeRefresh } from "../admin-realtime";
import styles from "./page.module.css";

type Evidence = { id: string; kind: string; scanStatus: string; previewUrl: string };
type ReviewCase = {
  id: string;
  status: string;
  idType: string;
  issuingCountry: string | null;
  documentExpiresAt: string | null;
  submittedAt: string | null;
  appealRequestedAt: string | null;
  user: { name: string; email: string };
  evidence: Evidence[];
};

function csrfToken(): string | undefined {
  const value = document.cookie.split("; ").find((item) => item.startsWith("XSRF-TOKEN="))?.split("=")[1];
  return value ? decodeURIComponent(value) : undefined;
}

function labelFor(value: string | null | undefined): string {
  if (!value) return "Not provided";
  return value.replaceAll("_", " ");
}

function formatDate(value: string | null): string {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: value.includes("T") ? "short" : undefined }).format(date);
}

function formatExpiry(value: string | null): string {
  if (!value) return "Not provided";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const formatted = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
  const expired = date.getTime() < Date.now();
  return expired ? `${formatted} · expired` : formatted;
}

function kindLabel(kind: string): string {
  return kind.replaceAll("_", " ");
}

function previewReason(item: ReviewCase): "appeal_review" | "initial_review" {
  return item.appealRequestedAt ? "appeal_review" : "initial_review";
}

export default function IdentityVerificationQueue() {
  const [items, setItems] = useState<ReviewCase[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [viewer, setViewer] = useState<ReviewCase | null>(null);
  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/api/v1/admin/marketplace/identity-verifications", { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error();
      setItems(((await response.json()) as { data: ReviewCase[] }).data);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);
  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);
  useAdminRealtimeRefresh(load);

  async function decide(item: ReviewCase, decision: "approved" | "needs_resubmission" | "rejected" | "escalated") {
    const passing = decision === "approved";
    const reason = passing
      ? "matched"
      : decision === "escalated"
        ? "needs_senior_review"
        : decision === "needs_resubmission"
          ? "image_unclear"
          : "identity_mismatch";
    try {
      await fetch("/api/v1/auth/csrf", { credentials: "include" });
      const token = csrfToken();
      const response = await fetch(`/api/v1/admin/marketplace/identity-verifications/${item.id}/decision`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { "X-XSRF-TOKEN": token } : {}) },
        body: JSON.stringify({ decision, reason, nameMatches: passing, dateOfBirthMatches: passing, ageEligible: passing }),
      });
      if (!response.ok) throw new Error(((await response.json()) as { error?: { message?: string } }).error?.message);
      setMessage("Review decision saved and the member was notified.");
      publishAdminRealtime({ type: "admin.identity.decided", resourceType: "identity_verification", resourceId: item.id });
      setViewer(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : "The review could not be saved.");
    }
  }

  return (
    <main className={styles.shell}>
      <AdminPageHeader
        eyebrow="TRUST & SAFETY"
        title="Identity reviews"
        description="Compare only the submitted ID and selfie. Never copy document details into notes."
      />
      {message && (
        <Feedback kind={message.startsWith("Review") ? "success" : "error"} title={message.startsWith("Review") ? "Decision saved" : "Action needed"}>
          {message}
        </Feedback>
      )}
      {state === "loading" && <AdminSkeletons count={3} />}
      {state === "error" && (
        <Feedback kind="error" title="The queue did not load">
          <Button onClick={() => void load()}>
            <RefreshCw />
            Try again
          </Button>
        </Feedback>
      )}
      {state === "ready" && items.length === 0 && (
        <section className={styles.empty}>
          <ScanFace />
          <h2>No identity checks waiting</h2>
          <p>New submissions and appeals will appear here.</p>
        </section>
      )}
      {state === "ready" &&
        items.map((item) => {
          const cleanCount = item.evidence.filter((evidence) => evidence.scanStatus === "clean").length;
          const pendingEvidence = item.evidence.filter((evidence) => evidence.scanStatus !== "clean");
          return (
            <article className={styles.card} key={item.id}>
              <div>
                <p className={styles.eyebrow}>{item.appealRequestedAt ? "APPEAL — DIFFERENT REVIEWER REQUIRED" : "IDENTITY CHECK"}</p>
                <h2>{item.user.name}</h2>
                <p>{item.user.email}</p>
              </div>
              <dl className={styles.meta}>
                <div>
                  <dt>ID type</dt>
                  <dd className={styles.titleCase}>{labelFor(item.idType)}</dd>
                </div>
                <div>
                  <dt>Issuing country</dt>
                  <dd>{item.issuingCountry || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Expiration date</dt>
                  <dd data-expired={item.documentExpiresAt && new Date(`${item.documentExpiresAt}T00:00:00`).getTime() < Date.now() ? "true" : undefined}>
                    {formatExpiry(item.documentExpiresAt)}
                  </dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{formatDate(item.submittedAt)}</dd>
                </div>
              </dl>
              <div className={styles.evidence}>
                {cleanCount > 0 ? (
                  <Button onClick={() => setViewer(item)} type="button" variant="secondary">
                    <Images aria-hidden="true" />
                    View attachments
                  </Button>
                ) : null}
                {pendingEvidence.map((evidence) => (
                  <span key={evidence.id}>
                    {kindLabel(evidence.kind)}: {evidence.scanStatus}
                  </span>
                ))}
              </div>
              <div className={styles.actions}>
                <ReviewActions item={item} onDecide={decide} />
              </div>
            </article>
          );
        })}
      <AttachmentViewer item={viewer} onClose={() => setViewer(null)} onDecide={decide} />
    </main>
  );
}

function ReviewActions({
  item,
  onDecide,
}: {
  item: ReviewCase;
  onDecide: (item: ReviewCase, decision: "approved" | "needs_resubmission" | "rejected" | "escalated") => void | Promise<void>;
}) {
  return (
    <>
      <Button onClick={() => void onDecide(item, "approved")}>Approve</Button>
      <Button variant="secondary" onClick={() => void onDecide(item, "needs_resubmission")}>
        Ask for clearer images
      </Button>
      <Button variant="secondary" onClick={() => void onDecide(item, "escalated")}>
        Escalate
      </Button>
      <Button variant="secondary" onClick={() => void onDecide(item, "rejected")}>
        Reject mismatch
      </Button>
    </>
  );
}

function AttachmentViewer({
  item,
  onClose,
  onDecide,
}: {
  item: ReviewCase | null;
  onClose: () => void;
  onDecide: (item: ReviewCase, decision: "approved" | "needs_resubmission" | "rejected" | "escalated") => void | Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reason = item ? previewReason(item) : "initial_review";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (item && !dialog.open) dialog.showModal();
    if (!item && dialog.open) dialog.close();
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [item]);

  return (
    <dialog
      aria-labelledby={titleId}
      className={styles.viewer}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (item) onClose();
      }}
      ref={dialogRef}
    >
      {item ? (
        <div className={styles.viewerPanel}>
          <header className={styles.viewerHeader}>
            <div>
              <p className={styles.eyebrow}>ATTACHMENTS</p>
              <h2 id={titleId}>{item.user.name}</h2>
              <p>
                {labelFor(item.idType)} · Expiration {formatExpiry(item.documentExpiresAt)}
              </p>
            </div>
            <button aria-label="Close attachments" className={styles.viewerClose} onClick={onClose} type="button">
              <X aria-hidden="true" />
            </button>
          </header>
          <div className={styles.viewerGrid}>
            {item.evidence.map((evidence) =>
              evidence.scanStatus === "clean" ? (
                <figure className={styles.viewerFigure} key={evidence.id}>
                  <figcaption>{kindLabel(evidence.kind)}</figcaption>
                  <img alt={`${kindLabel(evidence.kind)} for ${item.user.name}`} src={`${evidence.previewUrl}?reason=${reason}`} />
                </figure>
              ) : (
                <div className={styles.viewerPending} key={evidence.id}>
                  <strong>{kindLabel(evidence.kind)}</strong>
                  <span>{evidence.scanStatus}</span>
                </div>
              ),
            )}
          </div>
          <div className={styles.viewerActions}>
            <ReviewActions item={item} onDecide={onDecide} />
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
