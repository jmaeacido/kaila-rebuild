"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, RefreshCw, ShieldCheck, UserRoundX } from "lucide-react";
import { OperationsHeader } from "../components/operations-header";
import styles from "./page.module.css";

type Item = { id: string; reference: string; outcome: "completed" | "blocked"; blockers: { code: string; title: string }[]; requestedAt: string; completedAt: string | null };
type Data = { items: Item[]; summary: { completed: number; blocked: number; lastCompletedAt: string | null }; pagination: { currentPage: number; lastPage: number; total: number } };

export default function AccountDeletionsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState<"all" | "completed" | "blocked">("all");
  const load = useCallback(async () => { setState("loading"); try { const response = await fetch(`/api/v1/admin/marketplace/account-deletions${filter === "all" ? "" : `?outcome=${filter}`}`, { credentials: "include", cache: "no-store" }); if (!response.ok) throw new Error(); setData(((await response.json()) as { data: Data }).data); setState("ready"); } catch { setState("error"); } }, [filter]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  return <main className={styles.page}>
    <OperationsHeader eyebrow="PRIVACY OPERATIONS" title="Account deletion trail" description="A privacy-safe operational record of deletion outcomes. Personal identity is never displayed after erasure." actions={<button onClick={() => void load()} disabled={state === "loading"}><RefreshCw className={state === "loading" ? styles.spinner : ""}/>Refresh</button>}/>
    <section className={styles.stats} aria-label="Deletion summary"><article className={styles.completed}><span><CheckCircle2/></span><div><strong>{data?.summary.completed ?? "—"}</strong><p>Completed deletions</p></div></article><article className={styles.blocked}><span><AlertCircle/></span><div><strong>{data?.summary.blocked ?? "—"}</strong><p>Blocked attempts</p></div></article><article><span><Clock3/></span><div><strong>{data?.summary.lastCompletedAt ? new Date(data.summary.lastCompletedAt).toLocaleDateString() : "None yet"}</strong><p>Last completed</p></div></article></section>
    <section className={styles.workspace}><header><div><h2>Deletion activity</h2><p>References are anonymous and safe for operational follow-up.</p></div><div className={styles.filters} role="group" aria-label="Filter deletion activity">{(["all","completed","blocked"] as const).map(value => <button aria-pressed={filter === value} key={value} onClick={() => setFilter(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div></header>
      {state === "loading" && <div className={styles.skeletons} aria-label="Loading deletion activity"><span/><span/><span/></div>}
      {state === "error" && <div className={styles.error} role="alert"><AlertCircle/><div><h3>Deletion activity is unavailable</h3><p>Check the API connection and try again.</p><button onClick={() => void load()}>Try again</button></div></div>}
      {state === "ready" && data?.items.length === 0 && <div className={styles.empty}><UserRoundX/><h3>No deletion activity</h3><p>New completed or blocked deletion attempts will appear here.</p></div>}
      {state === "ready" && data && data.items.length > 0 && <div className={styles.list}>{data.items.map(item => <article key={item.id}><span className={item.outcome === "completed" ? styles.doneIcon : styles.blockIcon}>{item.outcome === "completed" ? <CheckCircle2/> : <ShieldCheck/>}</span><div className={styles.record}><div><h3>{item.reference}</h3><span className={item.outcome === "completed" ? styles.doneBadge : styles.blockBadge}>{item.outcome}</span></div><p>Requested {new Date(item.requestedAt).toLocaleString()}</p>{item.blockers.length > 0 && <ul>{item.blockers.map(blocker => <li key={blocker.code}>{blocker.title}</li>)}</ul>}</div><time>{item.completedAt ? `Completed ${new Date(item.completedAt).toLocaleString()}` : "Not processed"}</time></article>)}</div>}
    </section>
  </main>;
}
