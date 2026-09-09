"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ScanFace } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { AdminPageHeader, AdminSkeletons } from "../../components/admin-page";
import styles from "./page.module.css";

type Evidence = { id: string; kind: string; scanStatus: string; previewUrl: string };
type ReviewCase = { id: string; status: string; idType: string; submittedAt: string | null; appealRequestedAt: string | null; user: { name: string; email: string }; evidence: Evidence[] };

function csrfToken(): string | undefined {
  const value = document.cookie.split("; ").find((item) => item.startsWith("XSRF-TOKEN="))?.split("=")[1];
  return value ? decodeURIComponent(value) : undefined;
}

export default function IdentityVerificationQueue() {
  const [items, setItems] = useState<ReviewCase[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/api/v1/admin/marketplace/identity-verifications", { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error();
      setItems(((await response.json()) as { data: ReviewCase[] }).data);
      setState("ready");
    } catch { setState("error"); }
  }, []);
  useEffect(() => { const initialLoad = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(initialLoad); }, [load]);

  async function decide(item: ReviewCase, decision: "approved" | "needs_resubmission" | "rejected" | "escalated") {
    const passing = decision === "approved";
    const reason = passing ? "matched" : decision === "escalated" ? "needs_senior_review" : decision === "needs_resubmission" ? "image_unclear" : "identity_mismatch";
    try {
      await fetch("/api/v1/auth/csrf", { credentials: "include" });
      const token = csrfToken();
      const response = await fetch(`/api/v1/admin/marketplace/identity-verifications/${item.id}/decision`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { "X-XSRF-TOKEN": token } : {}) },
        body: JSON.stringify({ decision, reason, nameMatches: passing, dateOfBirthMatches: passing, ageEligible: passing }),
      });
      if (!response.ok) throw new Error(((await response.json()) as { error?: { message?: string } }).error?.message);
      setMessage("Review decision saved and the member was notified.");
      await load();
    } catch (error) { setMessage(error instanceof Error && error.message ? error.message : "The review could not be saved."); }
  }

  return <main className={styles.shell}>
    <AdminPageHeader eyebrow="TRUST & SAFETY" title="Identity reviews" description="Compare only the submitted ID and selfie. Never copy document details into notes." />
    {message && <Feedback kind={message.startsWith("Review") ? "success" : "error"} title={message.startsWith("Review") ? "Decision saved" : "Action needed"}>{message}</Feedback>}
    {state === "loading" && <AdminSkeletons count={3} />}
    {state === "error" && <Feedback kind="error" title="The queue did not load"><Button onClick={() => void load()}><RefreshCw />Try again</Button></Feedback>}
    {state === "ready" && items.length === 0 && <section className={styles.empty}><ScanFace /><h2>No identity checks waiting</h2><p>New submissions and appeals will appear here.</p></section>}
    {state === "ready" && items.map((item) => <article className={styles.card} key={item.id}>
      <div><p className={styles.eyebrow}>{item.appealRequestedAt ? "APPEAL — DIFFERENT REVIEWER REQUIRED" : "IDENTITY CHECK"}</p><h2>{item.user.name}</h2><p>{item.user.email} · {item.idType.replaceAll("_", " ")}</p></div>
      <div className={styles.evidence}>{item.evidence.map((evidence) => evidence.scanStatus === "clean" ? <a key={evidence.id} href={`${evidence.previewUrl}?reason=${item.appealRequestedAt ? "appeal_review" : "initial_review"}`} target="_blank" rel="noreferrer">View {evidence.kind.replace("_", " ")}</a> : <span key={evidence.id}>{evidence.kind.replace("_", " ")}: {evidence.scanStatus}</span>)}</div>
      <div className={styles.actions}><Button onClick={() => void decide(item, "approved")}>Approve</Button><Button variant="secondary" onClick={() => void decide(item, "needs_resubmission")}>Ask for clearer images</Button><Button variant="secondary" onClick={() => void decide(item, "escalated")}>Escalate</Button><Button variant="secondary" onClick={() => void decide(item, "rejected")}>Reject mismatch</Button></div>
    </article>)}
  </main>;
}
