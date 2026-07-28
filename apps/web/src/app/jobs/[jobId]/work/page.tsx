"use client";

import Link from "next/link";
import { FormEvent, use, useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileCheck2,
  Hammer,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Star,
  Upload,
  X,
} from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { LifecycleTimeline } from "./lifecycle-timeline";
import { useJobRealtime } from "./use-job-realtime";
import {
  prominentCompletionCopy,
  shouldShowHistoricalCompletionNote,
  shouldShowReviewDeadline,
} from "./work-copy";
import styles from "./work.module.css";

type Evidence = {
  id: string;
  original_name: string;
  mime_type: string;
  scan_status: string;
};

type Work = {
  jobId: string;
  status: string;
  version: number;
  role: "client" | "provider";
  workStartedAt: string | null;
  autoConfirmAt: string | null;
  completedAt: string | null;
  reviewClosesAt: string | null;
  reviewSubmitted: boolean;
  completion: {
    id: string;
    summary: string;
    cycle: number;
    submittedAt: string;
    evidence: Evidence[];
  } | null;
  cancellation: {
    id: string;
    requestedByMe: boolean;
    reason: string;
  } | null;
  dispute: {
    id: string;
    status: string;
    reason: string;
  } | null;
};

type Panel = "completion" | "revision" | "review" | "cancel" | "dispute" | null;
type RequestState = "loading" | "ready" | "saving" | "error";

const statusLabels: Record<string, string> = {
  provider_selected: "Provider selected",
  provider_traveling: "Provider is on the way",
  working: "Work in progress",
  completion_submitted: "Review the completed work",
  revision_requested: "Correction requested",
  disputed: "Support is reviewing",
  completed: "Job completed",
  rated_closed: "Job completed and rated",
  cancelled: "Job cancelled",
};

function readableError(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const value = body as { message?: unknown; error?: { message?: unknown } };
  if (typeof value.error?.message === "string") return value.error.message;
  if (typeof value.message === "string") return value.message;
  return fallback;
}

export default function WorkPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [data, setData] = useState<Work | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("loading");
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRequestState("loading");
    try {
      const response = await fetch(`/api/v1/jobs/${jobId}/work`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!response.ok) throw new Error();
      setData(((await response.json()) as { data: Work }).data);
      setRequestState("ready");
    } catch {
      if (!quiet) setRequestState("error");
    }
  }, [jobId]);
  const reconcileRealtime = useCallback(() => void load(true), [load]);

  useJobRealtime(jobId, reconcileRealtime);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const refresh = () => void load(true);
    const interval = window.setInterval(refresh, 20_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  async function command(path: string, body: object, success: string): Promise<boolean> {
    setRequestState("saving");
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/jobs/${jobId}/${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) throw new Error(readableError(result, "That update did not go through."));
      await load(true);
      setPanel(null);
      setNotice({ kind: "success", message: success });
      return true;
    } catch (error) {
      setRequestState("ready");
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "That update did not go through.",
      });
      return false;
    }
  }

  async function submitCompletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const summary = String(form.get("summary") || "").trim();
    setRequestState("saving");
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/jobs/${jobId}/completion`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ summary }),
      });
      const result = (await response.json().catch(() => null)) as
        | { data?: { id?: string }; error?: { message?: string } }
        | null;
      if (!response.ok || !result?.data?.id) {
        throw new Error(readableError(result, "Completion could not be submitted."));
      }
      const file = form.get("evidence");
      if (file instanceof File && file.size > 0) {
        const upload = new FormData();
        upload.set("file", file);
        const evidenceResponse = await fetch(`/api/v1/completions/${result.data.id}/evidence`, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
          body: upload,
        });
        if (!evidenceResponse.ok) {
          setNotice({
            kind: "error",
            message: "Completion was submitted, but the evidence upload failed. You can contact support to add it.",
          });
          await load(true);
          setPanel(null);
          return;
        }
      }
      await load(true);
      setPanel(null);
      setNotice({ kind: "success", message: "Completion sent to the client for review." });
    } catch (error) {
      setRequestState("ready");
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Completion could not be submitted.",
      });
    }
  }

  async function submitReason(event: FormEvent<HTMLFormElement>, type: "revision" | "cancel" | "dispute") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason") || "").trim();
    if (type === "dispute") {
      await submitDispute(form, reason);
      return;
    }
    const details = {
      revision: {
        path: "completion/revision",
        success: "Correction request sent to the provider.",
      },
      cancel: {
        path: "cancel",
        success: data?.status === "provider_selected"
          ? "Cancellation request sent. The other participant must agree."
          : "The job was cancelled.",
      },
    }[type];
    await command(details.path, { reason }, details.success);
  }

  async function submitDispute(form: FormData, reason: string) {
    setRequestState("saving");
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/jobs/${jobId}/disputes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ reason }),
      });
      const result = (await response.json().catch(() => null)) as
        | { data?: { id?: string }; error?: { message?: string } }
        | null;
      if (!response.ok || !result?.data?.id) {
        throw new Error(readableError(result, "Support review could not be opened."));
      }
      const file = form.get("evidence");
      if (file instanceof File && file.size > 0) {
        const evidence = new FormData();
        evidence.set("file", file);
        const evidenceResponse = await fetch(`/api/v1/disputes/${result.data.id}/evidence`, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
          body: evidence,
        });
        if (!evidenceResponse.ok) {
          setNotice({
            kind: "error",
            message: "Support review opened, but the evidence upload failed. You can send it in the job chat.",
          });
          await load(true);
          setPanel(null);
          return;
        }
      }
      await load(true);
      setPanel(null);
      setNotice({ kind: "success", message: "Support review opened. The job is now on hold." });
    } catch (error) {
      setRequestState("ready");
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Support review could not be opened.",
      });
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rating = Number(form.get("rating"));
    const comment = String(form.get("comment") || "").trim();
    await command(
      "reviews",
      { rating, comment: comment || null },
      "Review submitted. It will appear after both sides review or the review window closes.",
    );
  }

  if (requestState === "loading" && !data) {
    return <main className={styles.page}><div className={styles.skeleton} aria-label="Loading work status" /></main>;
  }

  if (!data) {
    return (
      <main className={styles.page}>
        <Feedback kind="error" title="Work status is unavailable">
          Check your connection and try again.
        </Feedback>
        <Button onClick={() => void load()}><RefreshCw /> Try again</Button>
      </main>
    );
  }

  const canDispute = ["provider_selected", "provider_traveling", "working", "completion_submitted", "completed"].includes(data.status);
  const canCancel = ["provider_selected", "provider_traveling"].includes(data.status);

  return (
    <main className={styles.page}>
      <nav className={styles.topbar}>
        <Link href={`/jobs/${jobId}`}><ArrowLeft aria-hidden="true" /> Job details</Link>
        <Link href={`/jobs/${jobId}/hired/conversation`}><MessageCircle aria-hidden="true" /> Chat</Link>
      </nav>

      <header className={styles.hero}>
        <p>HIRED JOB</p>
        <h1>{statusLabels[data.status] || "Job update"}</h1>
        <span>{primaryGuidance(data)}</span>
      </header>

      <section className={styles.progressCard}>
        <LifecycleTimeline status={data.status} />
      </section>

      {notice && (
        <Feedback kind={notice.kind} title={notice.kind === "success" ? "Job updated" : "Something went wrong"}>
          {notice.message}
        </Feedback>
      )}

      {data.cancellation && (
        <Feedback kind="info" title={data.cancellation.requestedByMe ? "Cancellation awaiting agreement" : "Cancellation requested"}>
          {data.cancellation.reason}
        </Feedback>
      )}

      {data.status === "disputed" && data.dispute && (
        <Feedback kind="info" title="Normal job actions are paused">
          Support is reviewing: {data.dispute.reason}
        </Feedback>
      )}

      <section className={styles.card}>
        <StatusIcon status={data.status} />
        <div>
          <h2>{data.completion ? `Completion submission ${data.completion.cycle}` : "Ready for the next step"}</h2>
          <p>
            {prominentCompletionCopy(
              data.status,
              data.completion?.summary,
              primaryGuidance(data),
            )}
          </p>
          {shouldShowHistoricalCompletionNote(
            data.status,
            data.completion?.summary,
          ) && (
            <small>
              Provider&apos;s completion note: {data.completion.summary}
            </small>
          )}
          {data.completion?.submittedAt && <small>Submitted {new Date(data.completion.submittedAt).toLocaleString()}</small>}
          {data.autoConfirmAt && <small>Client review ends {new Date(data.autoConfirmAt).toLocaleString()}</small>}
          {shouldShowReviewDeadline(data.status, data.reviewClosesAt) && (
            <small>
              Reviews close {new Date(data.reviewClosesAt).toLocaleString()}
            </small>
          )}
        </div>
      </section>

      {data.completion?.evidence.length ? (
        <section className={styles.evidence}>
          <h2>Completion evidence</h2>
          {data.completion.evidence.map((item) => (
            <div key={item.id}>
              <FileCheck2 aria-hidden="true" />
              <span><strong>{item.original_name}</strong><small>{item.scan_status === "clean" ? "Ready to view" : "Safety scan pending"}</small></span>
            </div>
          ))}
        </section>
      ) : null}

      <div className={styles.actions}>
        {data.role === "provider" && ["provider_selected", "provider_traveling", "revision_requested"].includes(data.status) && (
          <Button isLoading={requestState === "saving"} onClick={() => void command("work/start", {}, "Work started.")}>
            <Hammer /> {data.status === "revision_requested" ? "Resume corrections" : "Start work"}
          </Button>
        )}
        {data.role === "provider" && data.status === "working" && (
          <Button onClick={() => setPanel("completion")}><CheckCircle2 /> Submit completed work</Button>
        )}
        {data.role === "client" && data.status === "completion_submitted" && (
          <>
            <Button isLoading={requestState === "saving"} onClick={() => void command("completion/confirm", {}, "Job confirmed as completed.")}>
              <CheckCircle2 /> Confirm completed
            </Button>
            <Button variant="secondary" onClick={() => setPanel("revision")}><RotateCcw /> Request correction</Button>
          </>
        )}
        {data.status === "completed" && !data.reviewSubmitted && (
          <Button onClick={() => setPanel("review")}><Star /> Leave a review</Button>
        )}
        {data.status === "completed" && data.reviewSubmitted && (
          <p className={styles.submitted}><CheckCircle2 /> Your review has been submitted.</p>
        )}
        {data.cancellation && !data.cancellation.requestedByMe && canCancel && (
          <Button variant="danger" isLoading={requestState === "saving"} onClick={() => void command("cancel", { reason: "I agree with the pending cancellation request." }, "The job was cancelled by mutual agreement.")}>
            <CheckCircle2 /> Agree to cancel
          </Button>
        )}
        {!data.cancellation && canCancel && (
          <Button variant="secondary" onClick={() => setPanel("cancel")}><X /> Request cancellation</Button>
        )}
        {canDispute && data.status !== "disputed" && (
          <Button variant="secondary" onClick={() => setPanel("dispute")}><AlertTriangle /> Get support</Button>
        )}
      </div>

      {panel && (
        <section className={styles.sheet} aria-labelledby="action-title">
          <header>
            <div><p>{panelEyebrow(panel)}</p><h2 id="action-title">{panelTitle(panel)}</h2></div>
            <button type="button" onClick={() => setPanel(null)} aria-label="Close"><X /></button>
          </header>
          {panel === "completion" && <CompletionForm saving={requestState === "saving"} onSubmit={submitCompletion} />}
          {panel === "revision" && <ReasonForm type="revision" saving={requestState === "saving"} onSubmit={(event) => void submitReason(event, "revision")} />}
          {panel === "cancel" && <ReasonForm type="cancel" saving={requestState === "saving"} onSubmit={(event) => void submitReason(event, "cancel")} />}
          {panel === "dispute" && <ReasonForm type="dispute" saving={requestState === "saving"} onSubmit={(event) => void submitReason(event, "dispute")} />}
          {panel === "review" && <ReviewForm saving={requestState === "saving"} onSubmit={submitReview} />}
        </section>
      )}
    </main>
  );
}

function CompletionForm({ saving, onSubmit }: { saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label>What did you complete?<textarea name="summary" required minLength={10} maxLength={2000} placeholder="Describe the finished work and anything the client should check." /></label>
      <label className={styles.fileInput}><Upload /> Add photo or PDF evidence<input name="evidence" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" /></label>
      <p className={styles.hint}>One file up to 10 MB. The client can confirm, request a correction, or contact support.</p>
      <Button isLoading={saving}><CheckCircle2 /> Send for client review</Button>
    </form>
  );
}

function ReasonForm({ type, saving, onSubmit }: { type: "revision" | "cancel" | "dispute"; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const copy = {
    revision: ["What still needs correction?", "Describe the agreed work that is incomplete or needs adjustment.", "Send correction request"],
    cancel: ["Why do you need to cancel?", "Explain what changed. After hiring, the other participant may need to agree.", "Request cancellation"],
    dispute: ["What happened?", "Describe the problem and the outcome you need from KAILA support.", "Open support review"],
  }[type];
  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label>{copy[0]}<textarea name="reason" required minLength={10} maxLength={type === "dispute" ? 2000 : 1000} placeholder={copy[1]} /></label>
      {type === "dispute" && <label className={styles.fileInput}><Upload /> Add photo or PDF evidence<input name="evidence" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" /></label>}
      {type === "dispute" && <p className={styles.hint}><CircleAlert /> Work and completion timers pause while support reviews the case.</p>}
      <Button variant={type === "cancel" ? "danger" : "primary"} isLoading={saving}>{copy[2]}</Button>
    </form>
  );
}

function ReviewForm({ saving, onSubmit }: { saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <fieldset>
        <legend>How was your experience?</legend>
        <div className={styles.rating}>
          {[5, 4, 3, 2, 1].map((rating) => (
            <label key={rating}><input type="radio" name="rating" value={rating} required /><Star aria-hidden="true" /><span>{rating} star{rating === 1 ? "" : "s"}</span></label>
          ))}
        </div>
      </fieldset>
      <label>Review (optional)<textarea name="comment" maxLength={2000} placeholder="Share a clear, honest note about the job experience." /></label>
      <p className={styles.hint}>Your review stays private until both sides submit or the seven-day window closes.</p>
      <Button isLoading={saving}><Star /> Submit review</Button>
    </form>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed" || status === "rated_closed") return <CheckCircle2 aria-hidden="true" />;
  if (status === "disputed") return <AlertTriangle aria-hidden="true" />;
  if (status === "completion_submitted") return <Clock3 aria-hidden="true" />;
  return <Hammer aria-hidden="true" />;
}

function primaryGuidance(data: Work): string {
  if (data.status === "provider_selected") return data.role === "provider" ? "Travel to the client or start work when ready." : "The provider is preparing for your job.";
  if (data.status === "provider_traveling") return data.role === "provider" ? "Start work after arriving." : "Follow the provider’s travel status.";
  if (data.status === "working") return data.role === "provider" ? "Submit the finished work when it is ready for review." : "The provider is working on your job.";
  if (data.status === "completion_submitted") return data.role === "client" ? "Check the work, then confirm or request a correction." : "Waiting for the client to review the completed work.";
  if (data.status === "revision_requested") return data.role === "provider" ? "Review the correction request and resume work." : "Waiting for the provider to make the correction.";
  if (data.status === "completed") return data.reviewSubmitted ? "Your review is safely submitted." : "Share an honest review of your experience.";
  if (data.status === "rated_closed") return "This job and its review window are closed.";
  if (data.status === "disputed") return "Support is reviewing the job and normal actions are paused.";
  if (data.status === "cancelled") return "This job is closed and its history has been preserved.";
  return "Your job status is up to date.";
}

function panelEyebrow(panel: Exclude<Panel, null>): string {
  return panel === "review" ? "FINAL STEP" : panel === "dispute" ? "KAILA SUPPORT" : "JOB UPDATE";
}

function panelTitle(panel: Exclude<Panel, null>): string {
  return {
    completion: "Submit completed work",
    revision: "Request a correction",
    review: "Rate this job",
    cancel: "Request cancellation",
    dispute: "Open a support review",
  }[panel];
}
