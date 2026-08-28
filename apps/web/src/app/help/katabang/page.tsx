"use client";

import { Button, Feedback } from "@kaila/ui";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { prepareCsrf } from "../../auth-client";
import styles from "../../phase-nine.module.css";

type Answer = {
  answer: string;
  action: { label: string; href: string };
  disclaimer: string;
};

type Exchange = { question: string; answer: Answer };

export default function KatabangPage() {
  const [message, setMessage] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [state, setState] = useState<"ready" | "loading" | "error">("ready");

  async function sendQuestion(question: string) {
    setPendingQuestion(question);
    setState("loading");
    setMessage("");

    try {
      const token = await prepareCsrf();
      const response = await fetch("/api/v1/katabang", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
        body: JSON.stringify({
          message: question,
          conversation: exchanges.slice(-3).flatMap((exchange) => [
            { role: "user", content: exchange.question },
            { role: "assistant", content: exchange.answer.answer },
          ]),
        }),
      });
      if (!response.ok) throw new Error("Katabang request failed.");

      const answer = ((await response.json()) as { data: Answer }).data;
      setExchanges((current) => [...current, { question, answer }]);
      setPendingQuestion(null);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  async function ask(event: FormEvent) {
    event.preventDefault();
    const question = message.trim();
    if (!question || state === "loading") return;
    await sendQuestion(question);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/">Back home</Link>
        <p className={styles.eyebrow}>Katabang</p>
        <h1>What can I help you find?</h1>
        <p>AI guidance through KAILA. Katabang never chooses providers, prices, or account outcomes.</p>
      </header>

      <section className={styles.card}>
        <form className={styles.form} onSubmit={(event) => void ask(event)}>
          <label>
            Ask Katabang
            <textarea
              value={message}
              maxLength={500}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="How do I compare offers?"
            />
          </label>
          <Button disabled={message.trim().length === 0 || state === "loading"}>
            <Sparkles aria-hidden="true" />
            {state === "loading" ? "Thinking…" : "Ask Katabang"}
          </Button>
        </form>
      </section>

      {exchanges.map((exchange, index) => (
        <section className={styles.card} key={`${exchange.question}-${index}`}>
          <p className={styles.meta}>You asked: {exchange.question}</p>
          <h2>Katabang</h2>
          <p>{exchange.answer.answer}</p>
          <div className={styles.actions}>
            <Link className={styles.actionLink} href={exchange.answer.action.href}>{exchange.answer.action.label}</Link>
          </div>
          <p className={styles.meta}>{exchange.answer.disclaimer}</p>
        </section>
      ))}

      {pendingQuestion && (
        <section className={styles.card} aria-live="polite">
          <p className={styles.meta}>You asked: {pendingQuestion}</p>
          {state === "loading" && (
            <div className={styles.assistantThinking} role="status">
              <Sparkles aria-hidden="true" />
              <p>Katabang is thinking…</p>
            </div>
          )}
          {state === "error" && (
            <Feedback kind="error" title="Katabang is unavailable">
              <p>Your message is safe. Check your connection and try again.</p>
              <Button type="button" onClick={() => void sendQuestion(pendingQuestion)}>Try again</Button>
            </Feedback>
          )}
        </section>
      )}
    </main>
  );
}
