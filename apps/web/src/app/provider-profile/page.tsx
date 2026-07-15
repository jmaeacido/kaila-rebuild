"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button, Feedback, TextField } from "@kaila/ui";
import Link from "next/link";
import styles from "./profile.module.css";

type Item = { id: number; name: string };
export default function ProviderProfilePage() {
  const [categories, setCategories] = useState<Item[]>([]); const [areas, setAreas] = useState<Item[]>([]); const [message, setMessage] = useState<"idle" | "saving" | "saved" | "error">("idle");
  useEffect(() => { void fetch("/api/v1/marketplace/reference-data").then((r) => r.json()).then((body: { data: { categories: Item[]; areas: Item[] } }) => { setCategories(body.data.categories); setAreas(body.data.areas); }).catch(() => setMessage("error")); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setMessage("saving"); const data = new FormData(event.currentTarget);
    await fetch("/api/v1/auth/csrf", { credentials: "include" }); const token = document.cookie.split("; ").find((part) => part.startsWith("XSRF-TOKEN="))?.split("=")[1];
    const response = await fetch("/api/v1/me/provider-profile", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json", Accept: "application/json", ...(token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {}) }, body: JSON.stringify({ displayName: data.get("displayName"), bio: data.get("bio"), yearsExperience: Number(data.get("yearsExperience")), serviceIds: [Number(data.get("serviceId"))], areaIds: [Number(data.get("areaId"))], availability: [{ dayOfWeek: 1, startsAt: "08:00", endsAt: "17:00" }] }) }); setMessage(response.ok ? "saved" : "error"); }
  return <main className={styles.page}><Link className={styles.back} href="/"><ArrowLeft aria-hidden="true" /> Home</Link><section className={styles.panel} aria-labelledby="profile-title"><p className={styles.eyebrow}>PROVIDER ONBOARDING</p><h1 id="profile-title">Help clients know and trust you</h1><p>Tell people what you do and where you work. Your profile is reviewed before it appears in search.</p>
    <form onSubmit={(event) => void submit(event)} className={styles.form}><TextField id="displayName" name="displayName" label="Business or display name" required /><label>About your work<textarea name="bio" required minLength={20} maxLength={1200} /></label><TextField id="yearsExperience" name="yearsExperience" label="Years of experience" type="number" required />
      <label>Primary service<select name="serviceId" required><option value="">Choose a service</option>{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Service area<select name="areaId" required><option value="">Choose an area</option>{areas.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><Button type="submit" isLoading={message === "saving"}>Submit for review</Button></form>
    {message === "saved" && <Feedback kind="success" title="Profile sent for review"><CheckCircle2 aria-hidden="true" /> We’ll let you know when it is ready.</Feedback>}{message === "error" && <Feedback kind="error" title="Profile wasn’t saved">Check each field and try again.</Feedback>}
  </section></main>;
}
