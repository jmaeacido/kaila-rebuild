"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness, Home, MapPin, MessageCircle, Search, ShieldCheck, UserRound } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import styles from "./page.module.css";

type Reference = { id: number; name: string };
type Provider = { id: number; displayName: string; bio: string; rating: string | null; completedJobs: number; responseMinutes: number | null; verified: boolean; serviceAreas: Reference[] };

export default function HomePage() {
  const [categories, setCategories] = useState<Reference[]>([]); const [areas, setAreas] = useState<Reference[]>([]);
  const [categoryId, setCategoryId] = useState(""); const [areaId, setAreaId] = useState("");
  const [providers, setProviders] = useState<Provider[] | null>(null); const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => { void fetch("/api/v1/marketplace/reference-data").then(async (response) => {
    if (!response.ok) throw new Error(); const body = await response.json() as { data: { categories: Reference[]; areas: Reference[] } };
    setCategories(body.data.categories); setAreas(body.data.areas); setStatus("ready");
  }).catch(() => setStatus("error")); }, []);

  async function discover() {
    if (!categoryId || !areaId) return; setStatus("loading");
    try { const response = await fetch(`/api/v1/providers?categoryId=${categoryId}&areaId=${areaId}`); if (!response.ok) throw new Error();
      const body = await response.json() as { data: Provider[] }; setProviders(body.data); setStatus("ready");
    } catch { setStatus("error"); }
  }

  return <main className={styles.shell}>
    <header className={styles.topbar}><a className={styles.brand} href="#main">KAILA</a><a className={styles.profileLink} href="/provider-profile"><UserRound aria-hidden="true" /> Build provider profile</a></header>
    <div className={styles.layout}>
      <nav className={styles.desktopNav} aria-label="Primary"><NavItems /></nav>
      <section id="main" className={styles.content} aria-labelledby="home-title">
        <div className={styles.hero}><p className={styles.eyebrow}><MapPin aria-hidden="true" /> Nearby help, made simple</p><h1 id="home-title">What do you need right now?</h1><p>Tell local providers what you need in under a minute.</p><Button onClick={() => location.assign("/post-job")}>Post a Job</Button></div>
        <div className={styles.searchCard} aria-label="Find local providers">
          <label>Service<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Choose a service</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Area<select value={areaId} onChange={(event) => setAreaId(event.target.value)}><option value="">Choose your area</option>{areas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <Button onClick={() => void discover()} disabled={!categoryId || !areaId || status === "loading"}><Search aria-hidden="true" /> Find providers</Button>
        </div>
        {status === "loading" && <div className={styles.skeletons} aria-live="polite" aria-label="Loading providers"><span /><span /></div>}
        {status === "error" && <Feedback kind="error" title="We couldn’t load providers">Check your connection, then try again.</Feedback>}
        {status === "ready" && providers?.length === 0 && <div className={styles.empty}><MapPin aria-hidden="true" /><h2>No providers here yet</h2><p>Try another nearby area or service.</p><Button variant="secondary" onClick={() => setProviders(null)}>Change search</Button></div>}
        {providers && providers.length > 0 && <section aria-labelledby="results-title"><h2 id="results-title" className={styles.sectionTitle}>Providers near you</h2><div className={styles.grid}>{providers.map((provider) => <article className={styles.providerCard} key={provider.id}><div className={styles.avatar} aria-hidden="true">{provider.displayName.charAt(0)}</div><div><div className={styles.providerTitle}><h3>{provider.displayName}</h3>{provider.verified && <span className={styles.verified}><ShieldCheck aria-hidden="true" /> Verified</span>}</div><p>{provider.bio}</p><p className={styles.facts}>{provider.rating ?? "New"} rating · {provider.completedJobs} jobs · {provider.serviceAreas.map((area) => area.name).join(", ")}</p><Button>View profile</Button></div></article>)}</div></section>}
      </section>
    </div><nav className={styles.bottomNav} aria-label="Primary"><NavItems /></nav>
  </main>;
}

function NavItems() { return <><a aria-current="page" href="#main"><Home aria-hidden="true" /><span>Home</span></a><a href="#jobs"><BriefcaseBusiness aria-hidden="true" /><span>Jobs</span></a><a href="#messages"><MessageCircle aria-hidden="true" /><span>Messages</span></a><a href="/provider-profile"><UserRound aria-hidden="true" /><span>Profile</span></a></>; }
