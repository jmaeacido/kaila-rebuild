"use client";

import { FormEvent, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import Link from "next/link";
import styles from "../../phase-nine.module.css";

type Answer = { answer: string; action: { label: string; href: string }; disclaimer: string };
export default function KatabangPage() {
  const [message, setMessage] = useState(""); const [answer, setAnswer] = useState<Answer | null>(null); const [state, setState] = useState<"ready" | "loading" | "error">("ready");
  async function ask(event: FormEvent) { event.preventDefault(); setState("loading"); try { await fetch("/api/v1/auth/csrf", { credentials: "include" }); const token = document.cookie.split("; ").find((value) => value.startsWith("XSRF-TOKEN="))?.split("=")[1]; const response = await fetch("/api/v1/katabang", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...(token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {}) }, body: JSON.stringify({ message }) }); if (!response.ok) throw new Error(); setAnswer(((await response.json()) as { data: Answer }).data); setState("ready"); } catch { setState("error"); } }
  return <main className={styles.page}><header className={styles.header}><Link href="/">Back home</Link><p className={styles.eyebrow}>Katabang</p><h1>What can I help you find?</h1><p>Simple guidance through KAILA. Katabang never chooses providers, prices, or account outcomes.</p></header><section className={styles.card}><form className={styles.form} onSubmit={(event) => void ask(event)}><label>Ask Katabang<textarea value={message} maxLength={500} onChange={(event) => setMessage(event.target.value)} placeholder="How do I compare offers?" /></label><Button disabled={message.trim().length === 0 || state === "loading"}><Sparkles aria-hidden="true" />{state === "loading" ? "Finding help…" : "Ask Katabang"}</Button></form></section>{state === "error" && <Feedback kind="error" title="Katabang is unavailable">Try again or use the main navigation.</Feedback>}{answer && <section className={styles.card} aria-live="polite"><h2>Here’s the next step</h2><p>{answer.answer}</p><div className={styles.actions}><Link className={styles.actionLink} href={answer.action.href}>{answer.action.label}</Link></div><p className={styles.meta}>{answer.disclaimer}</p></section>}</main>;
}
