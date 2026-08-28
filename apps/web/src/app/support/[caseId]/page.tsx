"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, Clock3, MessageCircle, RefreshCw, RotateCcw, Send, Tag, UserRound, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { prepareCsrf } from "../../auth-client";
import { useRealtimeInvalidation } from "../../use-realtime-invalidation";
import styles from "../support.module.css";

type SupportMessage = { id: string; body: string; senderRole: "customer" | "staff"; senderName: string; createdAt: string };
type SupportCase = { id: string; reference: string; subject: string; status: string; category: string; assignedTo: string | null; messages: SupportMessage[] };
type Action = "reply" | "close" | "reopen";

const statusLabels: Record<string, string> = { open: "Open", waiting_for_support: "Waiting for support", waiting_for_customer: "Waiting for you", resolved: "Resolved", closed: "Closed" };
const categoryLabels: Record<string, string> = { account: "Account", booking: "Booking or job", payment: "Payment", provider: "Provider experience", technical: "App problem", feedback: "Feedback", other: "Other" };

async function responseMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message || fallback;
  } catch {
    return fallback;
  }
}

export default function SupportConversation() {
  const { caseId } = useParams<{ caseId: string }>();
  const [record, setRecord] = useState<SupportCase | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const previousMessageCount = useRef(0);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/support/cases/${encodeURIComponent(caseId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await responseMessage(response, "We couldn’t load this request."));
      setRecord(((await response.json()) as { data: SupportCase }).data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "We couldn’t load this request.");
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(true), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const messageCount = record?.messages.length ?? 0;
    if (messageCount > previousMessageCount.current && threadRef.current) {
      threadRef.current.scrollTo({ top: threadRef.current.scrollHeight, behavior: previousMessageCount.current ? "smooth" : "auto" });
    }
    previousMessageCount.current = messageCount;
  }, [record?.messages.length]);

  useRealtimeInvalidation(() => void load(), (event) => event.resourceType === "support_case" && event.resourceId === caseId);

  async function mutate(action: Action, body?: object) {
    setActiveAction(action);
    setError(null);
    try {
      const token = await prepareCsrf();
      const path = action === "reply" ? "messages" : action;
      const response = await fetch(`/api/v1/support/cases/${encodeURIComponent(caseId)}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "X-XSRF-TOKEN": token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) throw new Error(await responseMessage(response, "That action didn’t go through."));
      setRecord(((await response.json()) as { data: SupportCase }).data);
      if (action === "reply") setMessage("");
      if (action === "close") setConfirmClose(false);
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "That action didn’t go through. Try again.");
    } finally {
      setActiveAction(null);
    }
  }

  async function reply(event: FormEvent) {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (trimmedMessage) await mutate("reply", { message: trimmedMessage });
  }

  if (isLoading) return <main className={styles.page} aria-busy="true" aria-label="Loading support request"><div className={styles.skeleton} /><div className={`${styles.skeleton} ${styles.threadSkeleton}`} /></main>;

  if (!record) return (
    <main className={styles.page}>
      <section className={`${styles.card} ${styles.loadError}`} role="alert">
        <MessageCircle aria-hidden="true" /><h1>We couldn’t open this request</h1><p>{error ?? "It may be unavailable or you may be offline."}</p>
        <div className={styles.errorActions}>
          <button className={styles.action} type="button" onClick={() => void load(true)}><RefreshCw aria-hidden="true" />Try again</button>
          <Link className={styles.back} href="/support"><ArrowLeft aria-hidden="true" />All requests</Link>
        </div>
      </section>
    </main>
  );

  const closed = record.status === "closed";
  const busy = activeAction !== null;

  return (
    <main className={`${styles.page} ${styles.conversationPage}`}>
      <Link className={`${styles.back} ${styles.mobileBack}`} href="/support"><ArrowLeft aria-hidden="true" />All requests</Link>
      <header className={`${styles.card} ${styles.caseHeader}`}>
        <div className={styles.caseHeading}>
          <p className={styles.eyebrow}>{record.reference}</p><h1>{record.subject}</h1>
          <div className={styles.caseMeta} aria-label="Request details">
            <span className={styles.statusBadge} data-status={record.status}><Clock3 aria-hidden="true" />{statusLabels[record.status] ?? record.status}</span>
            <span><Tag aria-hidden="true" />{categoryLabels[record.category] ?? record.category}</span>
          </div>
        </div>
        <Link className={`${styles.back} ${styles.desktopBack}`} href="/support"><ArrowLeft aria-hidden="true" />All requests</Link>
        <div className={styles.assignment}><UserRound aria-hidden="true" /><div><strong>{record.assignedTo ?? "KAILA Support"}</strong><span>{record.assignedTo ? "Your support specialist" : "A specialist will review your request"}</span></div></div>
      </header>

      {error && <div className={styles.error} role="alert"><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><X aria-hidden="true" /></button></div>}

      <section className={`${styles.card} ${styles.threadCard}`} aria-label="Conversation">
        <div className={styles.thread} aria-live="polite" aria-relevant="additions" ref={threadRef}>
          {record.messages.length === 0 ? <div className={styles.emptyThread}><MessageCircle aria-hidden="true" /><p>Your conversation will appear here.</p></div> : record.messages.map((item) => {
            const mine = item.senderRole === "customer";
            return <article className={`${styles.message} ${mine ? styles.mine : styles.supportMessage}`} key={item.id}>
              <div className={styles.messageSender}><strong>{mine ? "You" : item.senderName}</strong>{!mine && <Check aria-label="KAILA Support" />}</div>
              <p>{item.body}</p><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time>
            </article>;
          })}
        </div>
      </section>

      {closed ? <section className={`${styles.card} ${styles.closedCard}`}><CheckCircle2 aria-hidden="true" /><div><h2>This request is closed</h2><p className={styles.muted}>Need more help with the same issue? Reopen it and continue here.</p></div><button className={styles.action} disabled={busy} type="button" onClick={() => void mutate("reopen")}><RotateCcw aria-hidden="true" />{activeAction === "reopen" ? "Reopening…" : "Reopen request"}</button></section> :
        <section className={`${styles.card} ${styles.composerCard}`}>
          <form className={styles.form} onSubmit={reply}>
            <label htmlFor="support-reply">Reply to KAILA Support</label>
            <textarea id="support-reply" value={message} maxLength={4000} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message…" disabled={busy} />
            <div className={styles.composerFooter}><span aria-live="polite">{message.length}/4000</span><button disabled={!message.trim() || busy}><Send aria-hidden="true" />{activeAction === "reply" ? "Sending…" : "Send reply"}</button></div>
          </form>
          <div className={styles.caseManagement}>
            {confirmClose ? <div className={styles.closeConfirmation} role="group" aria-label="Close request confirmation"><p>Close this request? You can reopen it later.</p><button type="button" onClick={() => setConfirmClose(false)} disabled={busy}>Keep open</button><button className={styles.confirmClose} type="button" onClick={() => void mutate("close")} disabled={busy}>{activeAction === "close" ? "Closing…" : "Yes, close"}</button></div> : <button type="button" onClick={() => setConfirmClose(true)} disabled={busy}><CheckCircle2 aria-hidden="true" />Close request</button>}
          </div>
        </section>}
    </main>
  );
}
