"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, BriefcaseBusiness, MapPin, Search, Star } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import styles from "./providers.module.css";

type Reference = { id: number; name: string; parent_id?: number | null; type?: string };
type Provider = { id: number; displayName: string; services: Reference[]; serviceAreas: Reference[]; availabilityStatus: string; verified: boolean; rating: number | null; reviewCount: number; completedJobs: number };

export default function FindProvidersPage() {
  const [references, setReferences] = useState<{ categories: Reference[]; areas: Reference[] }>({ categories: [], areas: [] });
  const [filters, setFilters] = useState({ categoryId: "", areaId: "", query: "" });
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "searching" | "error">("loading");

  useEffect(() => { void fetch("/api/v1/marketplace/reference-data").then(async response => { if (!response.ok) throw new Error(); const body = await response.json() as { data: typeof references }; setReferences(body.data); setStatus("ready"); }).catch(() => setStatus("error")); }, []);

  async function search(event?: FormEvent) {
    event?.preventDefault(); setStatus("searching");
    const params = new URLSearchParams();
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.areaId) params.set("areaId", filters.areaId);
    if (filters.query.trim()) params.set("query", filters.query.trim());
    try { const response = await fetch(`/api/v1/providers?${params}`, { cache: "no-store" }); if (!response.ok) throw new Error(); const body = await response.json() as { data: Provider[] }; setProviders(body.data); setStatus("ready"); } catch { setStatus("error"); }
  }

  return <main className={styles.shell}>
    <header className={styles.header}><Link href="/home" aria-label="Back to Home"><ArrowLeft /></Link><div><p>Provider discovery</p><h1>Find providers</h1></div></header>
    <form className={styles.filters} onSubmit={search}>
      <label>Service<select value={filters.categoryId} onChange={e => setFilters(current => ({ ...current, categoryId: e.target.value }))}><option value="">All services</option>{references.categories.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>City or service area<select value={filters.areaId} onChange={e => setFilters(current => ({ ...current, areaId: e.target.value }))}><option value="">All locations</option>{references.areas.filter(item => ["city", "municipality", "barangay"].includes(item.type || "")).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>Provider or business name<div className={styles.searchField}><Search /><input value={filters.query} onChange={e => setFilters(current => ({ ...current, query: e.target.value }))} placeholder="Search by name" /></div></label>
      <Button disabled={status === "searching"}>{status === "searching" ? "Searching…" : "Search providers"}</Button>
    </form>
    {status === "error" && <Feedback kind="error" title="We couldn’t load providers">Check your connection and try again.</Feedback>}
    {providers === null && status === "ready" && <section className={styles.intro}><Search /><h2>Choose how you want to search</h2><p>Find an eligible provider by service, area, name, or business.</p></section>}
    {providers?.length === 0 && <section className={styles.empty}><BriefcaseBusiness /><h2>No providers are currently available for this service in your area.</h2><p>You may post a job request so matching providers can respond when available.</p><Link href={`/post-job${filters.categoryId ? `?categoryId=${filters.categoryId}` : ""}`}>Post a job request</Link></section>}
    {providers && providers.length > 0 && <section className={styles.results} aria-live="polite"><p>{providers.length} provider{providers.length === 1 ? "" : "s"} found</p>{providers.map(provider => <article className={styles.card} key={provider.id}><div className={styles.cardTop}><div className={styles.avatar}>{provider.displayName.slice(0, 1)}</div><div><h2>{provider.displayName} {provider.verified && <BadgeCheck aria-label="Verified provider" />}</h2><p><MapPin />{provider.serviceAreas.map(area => area.name).slice(0, 3).join(", ")}</p></div><span className={styles.available}>Available</span></div><div className={styles.services}>{provider.services.map(service => <span key={service.id}>{service.name}</span>)}</div><div className={styles.metrics}><span><Star />{provider.rating === null ? "New" : provider.rating.toFixed(1)} · {provider.reviewCount} reviews</span><span><BriefcaseBusiness />{provider.completedJobs} completed</span></div><Link className={styles.profileLink} href={`/providers/${provider.id}`}>View profile</Link></article>)}</section>}
  </main>;
}
