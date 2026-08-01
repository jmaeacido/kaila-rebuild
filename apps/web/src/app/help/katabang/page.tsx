"use client";

import { FormEvent, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import Link from "next/link";
import styles from "../../phase-nine.module.css";

type Answer = { answer: string; action: { label: string; href: string }; disclaimer: string };
type Exchange = { question: string; answer: Answer };
export default function KatabangPage() {
  const [message, setMessage] = useState(""); const [exchanges, setExchanges] = useState<Exchange[]>([]); const [state, setState] = useState<"ready" | "loading" | "error">("ready");
  async function ask(event: FormEvent) { event.preventDefault(); const question = message.trim(); if (!question) return; setState("loading"); setMessage(""); try { await fetch("/api/v1/auth/csrf", { credentials: "include" }); const token = document.cookie.split("; ").find((value) => value.startsWith("XSRF-TOKEN="))?.split("=")[1]; const response = await fetch("/api/v1/katabang", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...(token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {}) }, body: JSON.stringify({ message: question, conversation: exchanges.slice(-3).flatMap((exchange) => [{ role: "user", content: exchange.question }, { role: "assistant", content: exchange.answer.answer }]) }) }); if (!response.ok) throw new Error(); const answer = ((await response.json()) as { data: Answer }).data; setExchanges((current) => [...current, { question, answer }]); setState("ready"); } catch { setMessage(question); setState("error"); } }
  return <main className={styles.page}><header className={styles.header}><Link href="/">Back home</Link><p className={styles.eyebrow}>Katabang</p><h1>What can I help you find?</h1><p>AI guidance through KAILA. Katabang never chooses providers, prices, or account outcomes.</p></header><section className={styles.card}><form className={styles.form} onSubmit={(event) => void ask(event)}><label>Ask Katabang<textarea value={message} maxLength={500} onChange={(event) => setMessage(event.target.value)} placeholder="How do I compare offers?" /></label><Button disabled={message.trim().length === 0 || state === "loading"}><Sparkles aria-hidden="true" />{state === "loading" ? "Thinking…" : "Ask Katabang"}</Button></form></section>{state === "error" && <Feedback kind="error" title="Katabang is unavailable">Try again or use the main navigation.</Feedback>}{exchanges.map((exchange, index) => <section className={styles.card} aria-live="polite" key={`${exchange.question}-${index}`}><p className={styles.meta}>You asked: {exchange.question}</p><h2>Katabang</h2><p>{exchange.answer.answer}</p><div className={styles.actions}><Link className={styles.actionLink} href={exchange.answer.action.href}>{exchange.answer.action.label}</Link></div><p className={styles.meta}>{exchange.answer.disclaimer}</p></section>)}</main>;
}
