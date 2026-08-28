"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileWarning,
  Flag,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { SelectField } from "../../components/select-field";
import { AttachmentPicker } from "../../components/attachment-picker";
import { prepareCsrf } from "../auth-client";
import styles from "./safety.module.css";

type Report = {
  id: string;
  targetType: string | null;
  targetId: string | null;
  category: string;
  details: string;
  status: string;
  createdAt: string;
  outcome: string | null;
  decisionReason: string | null;
  evidence: Array<{ id:string; originalName:string; mimeType:string; sizeBytes:number; scanStatus:string }>;
};

const targetLabels: Record<string, string> = {
  user: "Person",
  job: "Job",
  message: "Message",
  review: "Review",
  community_post: "Community post",
};

const statusLabels: Record<string, string> = {
  open: "Submitted",
  assigned: "Under review",
  decided: "Reviewed",
  closed: "Closed",
};

async function responseMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export default function SafetyPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [actionState, setActionState] = useState<"idle" | "saving">("idle");
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [targetType, setTargetType] = useState<string | null>(null);
  const [targetId, setTargetId] = useState("");
  const [details, setDetails] = useState("");

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      const response = await fetch("/api/v1/reports", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setReports(((await response.json()) as { data: Report[] }).data);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedTargetType = params.get("targetType");
      const requestedTargetId = params.get("targetId");
      if (requestedTargetType && requestedTargetId && targetLabels[requestedTargetType]) {
        setTargetType(requestedTargetType);
        setTargetId(requestedTargetId);
      }
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionState("saving");
    setNotice(null);
    const form = new FormData(event.currentTarget);
    try {
      const token = await prepareCsrf();
      form.set("details", details.trim());
      if (targetType && targetId) {
        form.set("targetType", targetType);
        form.set("targetId", targetId);
      }
      const response = await fetch("/api/v1/reports", {
        method: "POST",
        headers: {
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
        body: form,
      });
      if (!response.ok) {
        throw new Error(await responseMessage(response, "We couldn’t send this report."));
      }
      event.currentTarget.reset();
      setTargetType(null);
      setTargetId("");
      setDetails("");
      setNotice({ kind: "success", message: "Your report was sent privately to KAILA safety." });
      await load();
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "We couldn’t send this report.",
      });
    } finally {
      setActionState("idle");
    }
  }

  const activeCount = reports.filter((report) => ["open", "assigned"].includes(report.status)).length;

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Trust and safety</p>
          <h1>Safety center</h1>
          <p>Report harmful activity privately and follow KAILA’s review.</p>
        </div>
        <Link href="/account"><ArrowLeft aria-hidden="true" />Account</Link>
      </header>

      <section className={styles.hero} aria-labelledby="safety-hero-title">
        <span className={styles.heroIcon} aria-hidden="true"><ShieldCheck /></span>
        <div>
          <p className={styles.heroEyebrow}>Your safety comes first</p>
          <h2 id="safety-hero-title">Tell us what happened</h2>
          <p>Reports are private and reviewed by authorized KAILA staff. The person you report won’t see who sent it.</p>
        </div>
        <div className={styles.emergency}>
          <AlertTriangle aria-hidden="true" />
          <p><strong>In immediate danger?</strong> Contact local emergency services first, then report here when it’s safe.</p>
        </div>
      </section>

      {notice ? (
        <div aria-live="polite">
          <Feedback kind={notice.kind} title={notice.message}>
            {notice.kind === "success"
              ? "You can follow its review status below."
              : "Your details are still here. Review them and try again."}
          </Feedback>
        </div>
      ) : null}

      <div className={styles.layout}>
        <form className={`${styles.card} ${styles.reportForm}`} onSubmit={(event) => void submit(event)}>
          <div className={styles.cardHeading}>
            <span aria-hidden="true"><Flag /></span>
            <div><p className={styles.step}>Private report</p><h2>What are you reporting?</h2></div>
          </div>

          {targetType && targetId ? (
            <div className={styles.reportContext}>
              <CheckCircle2 aria-hidden="true" />
              <div><strong>Reporting this {targetLabels[targetType]?.toLowerCase()}</strong><p>KAILA attached it automatically, so you don’t need to find an item ID.</p></div>
            </div>
          ) : (
            <div className={styles.reportContext}>
              <ShieldCheck aria-hidden="true" />
              <div><strong>General safety concern</strong><p>Describe what happened. Safety staff can follow up if they need help identifying an item.</p></div>
            </div>
          )}

          <label>
            <span>Reason</span>
            <SelectField
              defaultValue=""
              label="Reason"
              name="category"
              options={[
                { value: "harassment", label: "Harassment or threats" },
                { value: "scam", label: "Scam or fraud" },
                { value: "unsafe", label: "Unsafe behavior" },
                { value: "spam", label: "Spam" },
                { value: "inappropriate", label: "Inappropriate content" },
                { value: "privacy", label: "Privacy concern" },
                { value: "other", label: "Something else" },
              ]}
              placeholder="Choose the closest reason"
              required
            />
          </label>

          <section className={styles.evidence} aria-labelledby="safety-evidence-title">
            <div>
              <h3 id="safety-evidence-title">Add helpful evidence</h3>
              <p>Photos, videos, screenshots, or PDFs can help the safety team understand what happened.</p>
            </div>
            <AttachmentPicker
              name="evidence"
              label="Upload evidence"
              hint="Optional. Add up to 5 files, 10 MB each. Every file is privately stored and safety-scanned."
              maxFiles={5}
              kinds={["image", "video", "pdf"]}
              facingMode="environment"
            />
          </section>

          <label>
            <span>What happened?</span>
            <textarea
              name="details"
              required
              minLength={10}
              maxLength={2000}
              placeholder="Share the important details. Don’t include passwords or payment codes."
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              aria-describedby="details-hint"
            />
            <small className={styles.detailsHint} id="details-hint">
              <span>At least 10 characters</span><span>{details.length} / 2,000</span>
            </small>
          </label>

          <div className={styles.formFooter}>
            <span><LockKeyhole aria-hidden="true" />Sent privately to KAILA safety</span>
            <Button isLoading={actionState === "saving"} disabled={actionState === "saving"} type="submit">
              <Flag aria-hidden="true" />Send report
            </Button>
          </div>
        </form>

        <section className={`${styles.card} ${styles.history}`} aria-labelledby="report-history-title">
          <div className={styles.historyHeading}>
            <div><p className={styles.step}>Review progress</p><h2 id="report-history-title">Your reports</h2></div>
            {loadState === "ready" && reports.length > 0 ? <span>{activeCount} active</span> : null}
          </div>

          {loadState === "loading" ? (
            <div className={styles.skeletons} aria-label="Loading your reports" aria-busy="true">
              <span /><span /><span />
            </div>
          ) : null}

          {loadState === "error" ? (
            <div className={styles.loadError} role="alert">
              <FileWarning aria-hidden="true" />
              <div><strong>We couldn’t load your reports</strong><p>Check your connection and try again.</p></div>
              <button type="button" onClick={() => void load()}><RefreshCw aria-hidden="true" />Try again</button>
            </div>
          ) : null}

          {loadState === "ready" && reports.length === 0 ? (
            <div className={styles.empty}>
              <ShieldCheck aria-hidden="true" />
              <strong>No reports yet</strong>
              <p>Reports you send will appear here with their review status.</p>
            </div>
          ) : null}

          {loadState === "ready" && reports.length > 0 ? (
            <div className={styles.reportList}>
              {reports.map((report) => (
                <article className={styles.report} key={report.id}>
                  <div className={styles.reportHeading}>
                    <span className={styles.reportIcon} aria-hidden="true"><Flag /></span>
                    <div>
                      <strong>{report.targetType ? targetLabels[report.targetType] ?? report.targetType.replaceAll("_", " ") : "General concern"}</strong>
                      <small>{report.category.replaceAll("_", " ")}</small>
                    </div>
                    <span className={styles.status} data-status={report.status}>
                      {report.status === "decided" || report.status === "closed" ? <CheckCircle2 aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
                      {statusLabels[report.status] ?? report.status}
                    </span>
                  </div>
                  <p>{report.details}</p>
                  <time dateTime={report.createdAt}>Sent {new Date(report.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time>
                  {report.evidence.length > 0 ? (
                    <div className={styles.evidenceSummary}>
                      <strong>{report.evidence.length} evidence file{report.evidence.length === 1 ? "" : "s"}</strong>
                      {report.evidence.map((item) => <span key={item.id}>{item.originalName} · {item.scanStatus === "clean" ? "Ready for review" : item.scanStatus === "rejected" ? "Removed by safety scan" : "Safety scan in progress"}</span>)}
                    </div>
                  ) : null}
                  {report.decisionReason ? (
                    <div className={styles.outcome}>
                      <strong>{report.outcome?.replaceAll("_", " ") || "Review outcome"}</strong>
                      <p>{report.decisionReason}</p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
