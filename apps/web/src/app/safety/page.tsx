"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Flag, RefreshCw, ShieldCheck } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { prepareCsrf } from "../auth-client";
import styles from "./safety.module.css";

type Report = { id:string; targetType:string; category:string; details:string; status:string; createdAt:string; outcome:string|null; decisionReason:string|null };

export default function SafetyPage(){
  const [reports,setReports]=useState<Report[]>([]); const [state,setState]=useState<"loading"|"ready"|"saving"|"error">("loading"); const [notice,setNotice]=useState("");
  const [targetType,setTargetType]=useState(()=>typeof window==="undefined"?"user":new URLSearchParams(window.location.search).get("targetType")||"user"); const [targetId,setTargetId]=useState(()=>typeof window==="undefined"?"":new URLSearchParams(window.location.search).get("targetId")||"");
  const load=useCallback(async()=>{setState("loading");try{const r=await fetch("/api/v1/reports",{cache:"no-store"});if(!r.ok)throw new Error();setReports(((await r.json()) as {data:Report[]}).data);setState("ready")}catch{setState("error")}},[]);
  useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[load]);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setState("saving");setNotice("");const form=new FormData(event.currentTarget);try{const token=await prepareCsrf();const r=await fetch("/api/v1/reports",{method:"POST",headers:{"Content-Type":"application/json",...(token?{"X-XSRF-TOKEN":token}:{})},body:JSON.stringify({targetType:form.get("targetType"),targetId:form.get("targetId"),category:form.get("category"),details:form.get("details")})});if(!r.ok)throw new Error();event.currentTarget.reset();setNotice("Your report was sent to KAILA safety.");await load()}catch{setState("error");setNotice("We couldn’t send this report. Check the item ID or try again.")}}
  return <main className={styles.shell}>
    <header><Link href="/account"><ArrowLeft/>Account</Link><ShieldCheck aria-hidden="true"/></header>
    <section className={styles.hero}><p>TRUST &amp; SAFETY</p><h1>Report a safety concern</h1><span>Reports are private. KAILA staff will review the item and record an outcome.</span></section>
    {notice&&<Feedback kind={state==="error"?"error":"success"} title={notice}>{state==="error"?"Review the item details and try again.":"You can track the outcome below."}</Feedback>} 
    <form className={styles.card} onSubmit={event=>void submit(event)}><h2><Flag/>What are you reporting?</h2>
      <label>Item type<select name="targetType" required value={targetType} onChange={event=>setTargetType(event.target.value)}><option value="user">User</option><option value="job">Job</option><option value="message">Message</option><option value="review">Review</option><option value="community_post">Community post</option></select></label>
      <label>Item ID<input name="targetId" required placeholder="Paste the item ID" value={targetId} onChange={event=>setTargetId(event.target.value)}/></label>
      <label>Reason<select name="category" required><option value="harassment">Harassment or threats</option><option value="scam">Scam or fraud</option><option value="unsafe">Unsafe behavior</option><option value="spam">Spam</option><option value="inappropriate">Inappropriate content</option><option value="privacy">Privacy concern</option><option value="other">Other</option></select></label>
      <label>What happened?<textarea name="details" required minLength={10} maxLength={2000}/></label>
      <Button disabled={state==="saving"} type="submit">{state==="saving"?<RefreshCw/>:<Flag/>}{state==="saving"?"Sending…":"Send report"}</Button>
    </form>
    <section className={styles.card}><h2>Your reports</h2>{state==="loading"?<p>Loading reports…</p>:reports.length===0?<p className={styles.empty}>You haven’t submitted any reports.</p>:reports.map(report=><article key={report.id}><div><strong>{report.targetType.replace("_"," ")}</strong><span>{report.status}</span></div><p>{report.details}</p><small>{new Date(report.createdAt).toLocaleString()}</small>{report.decisionReason&&<aside><b>{report.outcome?.replace("_"," ")}</b><p>{report.decisionReason}</p></aside>}</article>)}</section>
  </main>
}
