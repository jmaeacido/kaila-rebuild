"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Search, ShieldCheck } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { MarketplaceNavigation } from "../../components/marketplace-navigation";
import styles from "./messages.module.css";
import { useRealtimeInvalidation } from "../use-realtime-invalidation";

type JobConversation = {
  jobId: string; jobTitle: string;
  jobStatus: "provider_selected" | "provider_traveling" | "working" | "completion_submitted";
  role: "client" | "provider";
  otherParty: { id: number; name: string; avatarUrl: string | null };
  lastMessage: { body: string; sentByMe: boolean; createdAt: string } | null;
  updatedAt: string;
};
type UserMode = { activeMode: "client" | "provider" | null; providerEligible: boolean };
const statusLabels: Record<JobConversation["jobStatus"], string> = { provider_selected: "Provider hired", provider_traveling: "On the way", working: "Work in progress", completion_submitted: "Awaiting confirmation" };

function formatConversationTime(value: string): string {
  const date = new Date(value); const now = new Date();
  if (date.toDateString() === now.toDateString()) return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export default function MessagesPage() {
  const [items, setItems] = useState<JobConversation[]>([]); const [userMode, setUserMode] = useState<UserMode | null>(null);
  const [query, setQuery] = useState(""); const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setState("loading");
    try {
      const [conversationResponse, userResponse] = await Promise.all([fetch("/api/v1/job-conversations", { credentials: "include", cache: "no-store" }), fetch("/api/v1/me", { credentials: "include", cache: "no-store" })]);
      if (!conversationResponse.ok || !userResponse.ok) throw new Error();
      setItems(((await conversationResponse.json()) as { data: JobConversation[] }).data); setUserMode(((await userResponse.json()) as { data: UserMode }).data); setState("ready");
    } catch { if (!quiet) setState("error"); }
  }, []);
  useRealtimeInvalidation(() => void load(true), (event) => ["job_conversation", "service_job"].includes(event.resourceType));
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); const reconcile = () => void load(true); window.addEventListener("online", reconcile); return () => { window.clearTimeout(timer); window.removeEventListener("online", reconcile); }; }, [load]);
  const filteredItems = useMemo(() => { const normalized = query.trim().toLocaleLowerCase(); return items.filter((item) => !normalized || item.otherParty.name.toLocaleLowerCase().includes(normalized) || item.jobTitle.toLocaleLowerCase().includes(normalized) || item.lastMessage?.body.toLocaleLowerCase().includes(normalized)); }, [items, query]);
  const isProvider = userMode?.activeMode === "provider" && userMode.providerEligible; const jobsDestination = isProvider ? "/opportunities" : "/home#current-title";

  return <main className={styles.page}><div className={styles.inboxShell}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Your hired jobs</p><h1>Messages</h1><p>Messaging only works with accepted jobs.</p></div><Link className={styles.secondaryAction} href={jobsDestination}>{isProvider ? "View work" : "View jobs"}</Link></header>
    <aside className={styles.availabilityNote}><ShieldCheck aria-hidden="true" /><div><strong>Messaging only works with accepted jobs</strong><p>You can message each other after the client hires a provider.</p></div></aside>
    {state === "loading" && <div className={styles.skeletonList} aria-label="Loading job conversations"><span /><span /><span /></div>}
    {state === "error" && <Feedback kind="error" title="We couldn't load your job messages"><p>Check your connection and try again.</p><Button variant="secondary" onClick={() => void load()}>Try again</Button></Feedback>}
    {state === "ready" && items.length === 0 && <section className={styles.empty}><EmptyMessagesIllustration /><h2>No accepted-job conversations yet</h2><p>Messages will appear here after a provider is hired for a job.</p><Link className={styles.primaryAction} href={jobsDestination}>{isProvider ? "View your work" : "View your jobs"}</Link></section>}
    {state === "ready" && items.length > 0 && <><label className={styles.searchField}><Search aria-hidden="true" /><span className={styles.srOnly}>Search job conversations</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search jobs or people" /></label>
      {filteredItems.length === 0 ? <section className={styles.noResults}><Search aria-hidden="true" /><h2>No matching conversations</h2><p>Try another job title or person’s name.</p><button type="button" onClick={() => setQuery("")}>Clear search</button></section> : <section className={styles.conversationList} aria-label="Accepted job conversations">{filteredItems.map((item) => {
        const preview = item.lastMessage ? `${item.lastMessage.sentByMe ? "You: " : ""}${item.lastMessage.body}` : `Start planning “${item.jobTitle}”`; const time = item.lastMessage?.createdAt ?? item.updatedAt;
        return <Link className={styles.conversation} href={`/jobs/${item.jobId}/hired/conversation`} key={item.jobId}><span className={styles.avatar} aria-hidden="true">{item.otherParty.name.charAt(0).toUpperCase()}{item.otherParty.avatarUrl && <Image src={item.otherParty.avatarUrl} alt="" fill sizes="56px" unoptimized />}</span><span className={styles.conversationBody}><span className={styles.conversationTopline}><strong>{item.otherParty.name}</strong><time dateTime={time}>{formatConversationTime(time)}</time></span><span className={styles.jobTitle}>{item.jobTitle}</span><span className={styles.preview}>{preview}</span><span className={styles.jobStatus}>{statusLabels[item.jobStatus]}</span></span><ChevronRight aria-hidden="true" /></Link>;
      })}</section>}</>}
  </div><MarketplaceNavigation active="messages" /></main>;
}

function EmptyMessagesIllustration() {
  return <svg className={styles.emptyIllustration} viewBox="0 0 180 130" role="img" aria-label="A job card connected to a message bubble"><path className={styles.route} d="M29 102c22-8 27-31 53-25 20 5 19 28 40 27 14-1 20-12 29-23"/><circle className={styles.routeDot} cx="29" cy="102" r="5"/><circle className={styles.routeDot} cx="151" cy="81" r="5"/><rect className={styles.jobCardArt} x="13" y="24" width="87" height="58" rx="14"/><path className={styles.bubbleTwo} d="M91 49h64a14 14 0 0 1 14 14v23a14 14 0 0 1-14 14h-10v13l-16-13H91a14 14 0 0 1-14-14V63a14 14 0 0 1 14-14Z"/><path className={styles.artLines} d="M31 44h43M31 57h51M98 70h44M98 82h26"/></svg>;
}
