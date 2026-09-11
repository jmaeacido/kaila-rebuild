"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Images, RefreshCw, ScanFace, X } from "lucide-react";
import Image from "next/image";
import { Button, Feedback } from "@kaila/ui";
import { AdminPageHeader, AdminSkeletons } from "../../components/admin-page";
import { KailaBrandedQr } from "../../components/kaila-branded-qr";
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

function formatExpiry(value: string | null, currentTime: number): string {
  if (!value) return "Not provided";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const formatted = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
  const expired = date.getTime() < currentTime;
  return expired ? `${formatted} · expired` : formatted;
}

function kindLabel(kind: string): string {
  return kind.replaceAll("_", " ");
}

function previewReason(item: ReviewCase): "appeal_review" | "initial_review" {
  return item.appealRequestedAt ? "appeal_review" : "initial_review";
}

type Notice = {
  kind: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
};

export default function IdentityVerificationQueue() {
  const [currentTime] = useState(() => Date.now());
  const [items, setItems] = useState<ReviewCase[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error" | "mfa">("loading");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [viewer, setViewer] = useState<ReviewCase | null>(null);
  const [mfaConfigured, setMfaConfigured] = useState(false);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaOtpauthUrl, setMfaOtpauthUrl] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const load = useCallback(async () => {
    setState("loading");
    try {
      const mfaStatus = await fetch("/api/v1/admin/marketplace/mfa", { credentials: "include", cache: "no-store" });
      if (mfaStatus.ok) {
        const status = ((await mfaStatus.json()) as { data: { configured: boolean; sessionVerified: boolean } }).data;
        setMfaConfigured(status.configured);
        if (!status.configured || !status.sessionVerified) {
          setState("mfa");
          return;
        }
      }
      const response = await fetch("/api/v1/admin/marketplace/identity-verifications", { credentials: "include", cache: "no-store" });
      if (response.status === 403) {
        setState("mfa");
        return;
      }
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

  async function beginMfaSetup() {
    setMfaBusy(true);
    setNotice(null);
    try {
      await fetch("/api/v1/auth/csrf", { credentials: "include" });
      const token = csrfToken();
      const response = await fetch("/api/v1/admin/marketplace/mfa/setup", {
        method: "POST",
        credentials: "include",
        headers: token ? { "X-XSRF-TOKEN": token } : {},
      });
      if (!response.ok) {
        setNotice({ kind: "error", title: "Setup failed", body: "MFA setup could not start. Try again." });
        return;
      }
      const data = ((await response.json()) as { data: { secret: string; otpauthUrl: string } }).data;
      setMfaSecret(data.secret);
      setMfaOtpauthUrl(data.otpauthUrl);
    } finally {
      setMfaBusy(false);
    }
  }

  async function copySecret() {
    if (!mfaSecret) return;
    try {
      await navigator.clipboard.writeText(mfaSecret);
      setCopiedSecret(true);
      window.setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      setNotice({ kind: "warning", title: "Copy unavailable", body: "Could not copy the secret. Select it manually." });
    }
  }

  async function copyRecoveryCodes() {
    if (!recoveryCodes?.length) return;
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setCopiedRecovery(true);
      window.setTimeout(() => setCopiedRecovery(false), 2000);
    } catch {
      setNotice({ kind: "warning", title: "Copy unavailable", body: "Select the recovery codes and copy them manually." });
    }
  }

  async function submitMfa(kind: "confirm" | "challenge") {
    setMfaBusy(true);
    setNotice(null);
    try {
      await fetch("/api/v1/auth/csrf", { credentials: "include" });
      const token = csrfToken();
      const response = await fetch(`/api/v1/admin/marketplace/mfa/${kind}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { "X-XSRF-TOKEN": token } : {}) },
        body: JSON.stringify({ code: mfaCode }),
      });
      if (!response.ok) {
        setNotice({ kind: "error", title: "Code rejected", body: "The MFA code was rejected. Check your authenticator and try again." });
        return;
      }
      const payload = (await response.json()) as { data?: { recoveryCodes?: string[] } };
      setMfaCode("");
      setMfaSecret(null);
      setMfaOtpauthUrl(null);
      if (kind === "confirm") {
        const codes = payload.data?.recoveryCodes ?? [];
        setRecoveryCodes(codes);
        setNotice({
          kind: "success",
          title: "MFA configured",
          body: codes.length
            ? "Save the recovery codes below now. They are shown only once."
            : "Your authenticator is ready for identity reviews.",
        });
      } else {
        setNotice({ kind: "success", title: "Verified", body: "MFA challenge passed. You can review identity evidence." });
      }
      await load();
    } finally {
      setMfaBusy(false);
    }
  }

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
      setNotice({ kind: "success", title: "Decision saved", body: "The member was notified of the review result." });
      publishAdminRealtime({ type: "admin.identity.decided", resourceType: "identity_verification", resourceId: item.id });
      setViewer(null);
      await load();
    } catch (error) {
      setNotice({
        kind: "error",
        title: "Decision failed",
        body: error instanceof Error && error.message ? error.message : "The review could not be saved.",
      });
    }
  }

  return (
    <main className={styles.shell}>
      <AdminPageHeader
        eyebrow="TRUST & SAFETY"
        title="Identity reviews"
        description="Compare only the submitted ID and selfie. Never copy document details into notes."
      />
      {notice && (
        <Feedback kind={notice.kind} title={notice.title}>
          {notice.body}
        </Feedback>
      )}
      {recoveryCodes && recoveryCodes.length > 0 ? (
        <section className={`${styles.card} ${styles.recoveryCard}`} aria-label="MFA recovery codes">
          <div className={styles.mfaIntro}>
            <p className={styles.eyebrow}>Save these once</p>
            <h2>Recovery codes</h2>
            <p>Store these offline. Each code works once if you lose your authenticator.</p>
          </div>
          <ol className={styles.recoveryList}>
            {recoveryCodes.map((code) => (
              <li key={code}><code>{code}</code></li>
            ))}
          </ol>
          <div className={styles.secretRow}>
            <Button type="button" variant="secondary" onClick={() => void copyRecoveryCodes()}>
              {copiedRecovery ? "Copied" : "Copy all codes"}
            </Button>
            <Button type="button" onClick={() => setRecoveryCodes(null)}>
              I’ve saved them
            </Button>
          </div>
        </section>
      ) : null}
      {state === "mfa" && (
        <section className={`${styles.card} ${styles.mfaCard}`}>
          <div className={styles.mfaIntro}>
            <p className={styles.eyebrow}>Account security</p>
            <h2>Multi-factor authentication required</h2>
            <p>Identity evidence access requires MFA on this admin account. Scan the KAILA QR with your authenticator app, then enter a 6-digit code.</p>
          </div>
          {!mfaConfigured ? (
            <div className={styles.mfaSetup}>
              {!mfaOtpauthUrl ? (
                <Button type="button" variant="secondary" disabled={mfaBusy} onClick={() => void beginMfaSetup()}>
                  {mfaBusy ? "Preparing…" : "Start MFA setup"}
                </Button>
              ) : (
                <div className={styles.mfaSetupGrid}>
                  <KailaBrandedQr
                    value={mfaOtpauthUrl}
                    label="Scan with Google Authenticator, Authy, or 1Password"
                    size={220}
                  />
                  <div className={styles.mfaManual}>
                    <h3>Can’t scan?</h3>
                    <p>Add the account manually with this secret, then confirm the code below.</p>
                    <div className={styles.secretRow}>
                      <code className={styles.secret}>{mfaSecret}</code>
                      <Button type="button" variant="secondary" onClick={() => void copySecret()}>
                        {copiedSecret ? "Copied" : "Copy secret"}
                      </Button>
                    </div>
                    <label className={styles.mfaField}>
                      Confirmation code
                      <input
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="000000"
                        maxLength={8}
                      />
                    </label>
                    <Button type="button" disabled={mfaBusy || mfaCode.trim().length < 6} onClick={() => void submitMfa("confirm")}>
                      {mfaBusy ? "Confirming…" : "Confirm MFA"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.mfaChallenge}>
              <label className={styles.mfaField}>
                Authenticator code
                <input
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={8}
                />
              </label>
              <Button type="button" disabled={mfaBusy || mfaCode.trim().length < 6} onClick={() => void submitMfa("challenge")}>
                {mfaBusy ? "Verifying…" : "Verify MFA"}
              </Button>
            </div>
          )}
        </section>
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
          <ScanFace aria-hidden="true" />
          <h2>No identity checks waiting</h2>
          <p>When members submit ID and selfie evidence, new reviews and appeals appear here.</p>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            <RefreshCw aria-hidden="true" />
            Refresh queue
          </Button>
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
                  <dd data-expired={item.documentExpiresAt && new Date(`${item.documentExpiresAt}T00:00:00`).getTime() < currentTime ? "true" : undefined}>
                    {formatExpiry(item.documentExpiresAt, currentTime)}
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
      <AttachmentViewer currentTime={currentTime} item={viewer} onClose={() => setViewer(null)} onDecide={decide} />
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
  currentTime,
  item,
  onClose,
  onDecide,
}: {
  currentTime: number;
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
                {labelFor(item.idType)} · Expiration {formatExpiry(item.documentExpiresAt, currentTime)}
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
                  <Image
                    alt={`${kindLabel(evidence.kind)} for ${item.user.name}`}
                    height={900}
                    src={`${evidence.previewUrl}?reason=${reason}`}
                    unoptimized
                    width={1200}
                  />
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
