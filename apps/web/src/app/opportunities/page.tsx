"use client";
import { useCallback, useEffect, useState } from "react";
import { BriefcaseBusiness, CalendarClock, MapPin, RefreshCw, WalletCards } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import styles from "./page.module.css";
type Opportunity = { id:number; jobId:string; state:string; title:string; description:string; area:{name:string}; category:{name:string}; scheduleType:string; scheduledAt:string|null; budgetMinCentavos:number|null; budgetMaxCentavos:number|null; attachmentCount:number };
export default function OpportunitiesPage() {
  const [items,setItems]=useState<Opportunity[]>([]); const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
  const load=useCallback(async()=>{try{const response=await fetch("/api/v1/opportunities",{cache:"no-store"});if(!response.ok)throw new Error();const body=await response.json() as {data:Opportunity[]};setItems(body.data);setStatus("ready");}catch{setStatus("error");}},[]);
  useEffect(()=>{const initial=window.setTimeout(()=>void load(),0);const reconcile=()=>void load();window.addEventListener("online",reconcile);return()=>{window.clearTimeout(initial);window.removeEventListener("online",reconcile);};},[load]);
  async function dismiss(id:number){const response=await fetch(`/api/v1/opportunities/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision:"dismissed"})});if(response.ok)setItems(current=>current.filter(row=>row.id!==id));else setStatus("error");}
  return <main className={styles.shell}><header><div><p>Provider mode</p><h1>Opportunities</h1></div><Button variant="secondary" onClick={()=>void load()}><RefreshCw aria-hidden="true"/>Refresh</Button></header>
    {status==="loading"&&<div className={styles.skeletons} aria-label="Loading opportunities"><span/><span/></div>}{status==="error"&&<Feedback kind="error" title="We couldn’t refresh opportunities">Check your connection, then try again.</Feedback>}
    {status==="ready"&&items.length===0&&<section className={styles.empty}><BriefcaseBusiness aria-hidden="true"/><h2>No nearby jobs right now</h2><p>We’ll show jobs that match your services, area, and availability.</p><Button onClick={()=>void load()}>Check again</Button></section>}
    <section className={styles.list}>{items.map(item=><article key={item.id}><div className={styles.title}><span>{item.category.name}</span><h2>{item.title}</h2></div><p>{item.description}</p><dl><div><MapPin aria-hidden="true"/><dt>Area</dt><dd>{item.area.name}</dd></div><div><CalendarClock aria-hidden="true"/><dt>When</dt><dd>{item.scheduleType==="asap"?"As soon as possible":new Date(item.scheduledAt??"").toLocaleString()}</dd></div><div><WalletCards aria-hidden="true"/><dt>Budget</dt><dd>{money(item.budgetMinCentavos,item.budgetMaxCentavos)}</dd></div></dl><p className={styles.privacy}>The exact address stays private until the client hires.</p><div className={styles.actions}><Button variant="secondary" onClick={()=>void dismiss(item.id)}>Dismiss</Button><Button onClick={()=>location.assign(`/opportunities/${item.jobId}`)}>View Job</Button></div></article>)}</section>
  </main>;
}
function money(min:number|null,max:number|null){if(min===null&&max===null)return "Open to offers";const peso=(value:number|null)=>value===null?"—":`₱${(value/100).toLocaleString()}`;return `${peso(min)} – ${peso(max)}`;}
