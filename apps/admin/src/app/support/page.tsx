"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, ArrowLeft, CheckCircle2, Clock3, Inbox, RefreshCw, Search, Send, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { prepareCsrf } from "../auth-client";
import styles from "./support.module.css";

type Message = { id: string; body: string; senderRole: string; senderName: string; createdAt: string };
type SupportCase = { id: string; reference: string; subject: string; category: string; status: string; priority: string; customer: { name: string; email: string }; assignedTo: { name: string } | null; messageCount: number; lastMessageAt: string; unread?: boolean; messages: Message[] | null };
const statusLabels: Record<string, string> = { open: "Open", waiting_for_support: "Needs reply", waiting_for_customer: "Waiting for customer", resolved: "Resolved", closed: "Closed" };
const relativeTime = (value: string) => new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60_000)), "minute");

function SupportWorkspace() {
  const params = useSearchParams();
  const requestedCaseId = params.get("case");
  const requestedMessageId = params.get("message");
  const [items, setItems] = useState<SupportCase[]>([]);
  const [selected, setSelected] = useState<SupportCase | null>(null);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const conversationRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (!["active", "all"].includes(statusFilter)) query.set("status", statusFilter);
      if (statusFilter === "all") query.set("status", "closed");
      if (priorityFilter !== "all") query.set("priority", priorityFilter);
      if (search.trim()) query.set("search", search.trim());
      const response = await fetch(`/api/v1/admin/marketplace/support/cases?${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setItems(((await response.json()) as { data: { data: SupportCase[] } }).data.data);
      setState("ready");
    } catch { setState("error"); }
  }, [priorityFilter, search, statusFilter]);

  const openCase = useCallback(async (caseId: string) => {
    setState("loading");
    try {
      const response = await fetch(`/api/v1/admin/marketplace/support/cases/${encodeURIComponent(caseId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setSelected(((await response.json()) as { data: SupportCase }).data);
      setState("ready");
    } catch { setState("error"); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 200); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (!requestedCaseId || selected?.id === requestedCaseId) return;
    const timer = window.setTimeout(() => void openCase(requestedCaseId), 0);
    return () => window.clearTimeout(timer);
  }, [openCase, requestedCaseId, selected?.id]);
  useEffect(() => {
    if (!selected?.messages?.length) return;
    const target = requestedMessageId ? document.getElementById(`support-message-${requestedMessageId}`) : conversationRef.current?.lastElementChild;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [requestedMessageId, selected]);

  const counts = useMemo(() => ({ total: items.length, urgent: items.filter((item) => ["high", "urgent"].includes(item.priority)).length, waiting: items.filter((item) => item.status === "waiting_for_support").length }), [items]);

  async function update(data: object) {
    if (!selected) return;
    setState("saving");
    const token = await prepareCsrf();
    const response = await fetch(`/api/v1/admin/marketplace/support/cases/${selected.id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...(token ? { "X-XSRF-TOKEN": token } : {}) }, body: JSON.stringify(data) });
    if (!response.ok) return setState("error");
    setSelected(((await response.json()) as { data: SupportCase }).data);
    setState("ready");
    await load();
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    setState("saving");
    const token = await prepareCsrf();
    const response = await fetch(`/api/v1/admin/marketplace/support/cases/${selected.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { "X-XSRF-TOKEN": token } : {}) }, body: JSON.stringify({ message: reply.trim() }) });
    if (!response.ok) return setState("error");
    setSelected(((await response.json()) as { data: SupportCase }).data);
    setReply(""); setState("ready"); await load();
  }

  return <main className={styles.page}>
    <header className={styles.hero}><div><p>Customer care</p><h1>Support conversations</h1><span>See what needs attention, understand the customer, and resolve it in one place.</span></div><button className={styles.refresh} type="button" onClick={() => void load()} disabled={state === "loading"}><RefreshCw aria-hidden="true" />Refresh</button></header>
    <section className={styles.summary} aria-label="Support queue summary"><div><Inbox aria-hidden="true" /><span><strong>{counts.total}</strong>Active requests</span></div><div><Clock3 aria-hidden="true" /><span><strong>{counts.waiting}</strong>Need a reply</span></div><div><span className={styles.priorityDot} /><span><strong>{counts.urgent}</strong>High priority</span></div></section>
    {state === "error" && <div className={styles.error} role="alert">Support could not be updated. Check your connection and try again.</div>}
    <div className={`${styles.workspace} ${selected ? styles.hasSelection : ""}`}>
      <aside className={styles.queue} aria-label="Support requests"><div className={styles.tools}><label className={styles.search}><Search aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reference or subject" /></label><div className={styles.filters}><select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="active">Active</option><option value="waiting_for_support">Needs reply</option><option value="waiting_for_customer">Waiting</option><option value="resolved">Resolved</option><option value="all">Closed</option></select><select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="all">All priorities</option><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></div></div>
        <div className={styles.caseList}>{state === "loading" && items.length === 0 && <div className={styles.loading}>Loading conversations…</div>}{state === "ready" && items.length === 0 && <div className={styles.empty}><CheckCircle2 aria-hidden="true" /><strong>Queue is clear</strong><span>No requests match these filters.</span></div>}{items.map((item) => <button key={item.id} type="button" className={selected?.id === item.id ? styles.selectedCase : ""} onClick={() => void openCase(item.id)}><span className={styles.caseTop}><strong>{item.subject}</strong><time>{relativeTime(item.lastMessageAt)}</time></span><span className={styles.caseCustomer}>{item.customer.name}</span><span className={styles.caseMeta}><em data-priority={item.priority}>{item.priority}</em><span>{statusLabels[item.status] ?? item.status}</span><span>{item.messageCount} messages</span></span></button>)}</div>
      </aside>
      <section className={styles.detail} aria-label="Selected support conversation">{!selected ? <div className={styles.noSelection}><Inbox aria-hidden="true" /><h2>Select a conversation</h2><p>Choose a request to read its history and respond.</p></div> : <>
        <header className={styles.detailHeader}><button className={styles.back} type="button" onClick={() => setSelected(null)} aria-label="Back to support requests"><ArrowLeft aria-hidden="true" /></button><div><span>{selected.reference}</span><h2>{selected.subject}</h2><p>{selected.category} · {statusLabels[selected.status] ?? selected.status}</p></div><label>Priority<select value={selected.priority} onChange={(event) => void update({ priority: event.target.value })}><option>low</option><option>normal</option><option>high</option><option>urgent</option></select></label></header>
        <div className={styles.customer}><UserRound aria-hidden="true" /><div><strong>{selected.customer.name}</strong><a href={`mailto:${selected.customer.email}`}>{selected.customer.email}</a></div><span>{selected.assignedTo?.name ? `Owned by ${selected.assignedTo.name}` : "Unassigned"}</span></div>
        <div className={styles.conversation} ref={conversationRef}>{selected.messages?.map((message) => <article id={`support-message-${message.id}`} key={message.id} className={message.senderRole === "staff" ? styles.staffMessage : styles.customerMessage} data-targeted={requestedMessageId === String(message.id) || undefined}><header><strong>{message.senderName}</strong><time>{new Date(message.createdAt).toLocaleString()}</time></header><p>{message.body}</p></article>)}</div>
        <form className={styles.composer} onSubmit={send}><label htmlFor="support-reply">Reply to {selected.customer.name}</label><textarea id="support-reply" value={reply} maxLength={4000} onChange={(event) => setReply(event.target.value)} placeholder="Write a clear, helpful response…" disabled={selected.status === "closed"} /><div><span>{reply.length}/4000</span><button className={styles.secondary} type="button" onClick={() => void update({ status: "resolved" })}><CheckCircle2 aria-hidden="true" />Resolve</button><button className={styles.secondary} type="button" onClick={() => void update({ status: "closed" })}><Archive aria-hidden="true" />Close</button><button className={styles.send} disabled={!reply.trim() || state === "saving" || selected.status === "closed"}><Send aria-hidden="true" />{state === "saving" ? "Sending…" : "Send reply"}</button></div></form>
      </>}</section>
    </div>
  </main>;
}

export default function SupportPage() { return <Suspense fallback={<main className={styles.page}><div className={styles.loading}>Loading support…</div></main>}><SupportWorkspace /></Suspense>; }
