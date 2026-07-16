"use client";

import { FormEvent, useState } from "react";
import { HeartHandshake } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../../phase-nine.module.css";

export default function ShareCommunityPostPage() {
  const router = useRouter(); const [kind, setKind] = useState("local_tip"); const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [area, setArea] = useState(""); const [state, setState] = useState<"ready" | "loading" | "error">("ready");
  async function publish(event: FormEvent) { event.preventDefault(); setState("loading"); try { await fetch("/api/v1/auth/csrf", { credentials: "include" }); const token = document.cookie.split("; ").find((value) => value.startsWith("XSRF-TOKEN="))?.split("=")[1]; const response = await fetch("/api/v1/community", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...(token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {}) }, body: JSON.stringify({ kind, title, body, areaLabel: area || null }) }); if (!response.ok) throw new Error(); router.push("/community"); } catch { setState("error"); } }
  return <main className={styles.page}><header className={styles.header}><Link href="/community">Back to community</Link><p className={styles.eyebrow}>Share with care</p><h1>Share a useful local story</h1><p>Never post a clientâ€™s address, private messages, or identifying job details.</p></header><section className={styles.card}><form className={styles.form} onSubmit={(event) => void publish(event)}><label>Post type<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="local_tip">Local tip</option><option value="work_story">Work story</option><option value="service_question">Service question</option></select></label><label>Title<input maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Story<textarea maxLength={3000} value={body} onChange={(event) => setBody(event.target.value)} /></label><label>Area, optional<input maxLength={120} value={area} onChange={(event) => setArea(event.target.value)} /></label><Button disabled={title.trim().length === 0 || body.trim().length === 0 || state === "loading"}><HeartHandshake aria-hidden="true" />{state === "loading" ? "Publishingâ€¦" : "Publish story"}</Button></form></section>{state === "error" && <Feedback kind="error" title="Story was not published">Sign in, review the fields, and try again.</Feedback>}</main>;
}
