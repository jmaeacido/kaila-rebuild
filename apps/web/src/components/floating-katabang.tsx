"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, Sparkles, X } from "lucide-react";
import { prepareCsrf } from "../app/auth-client";
import styles from "./floating-katabang.module.css";

type Answer = {
  answer: string;
  action: { label: string; href: string };
  disclaimer: string;
};

type Exchange = {
  question: string;
  answer: Answer;
};

export function FloatingKatabang() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [state, setState] = useState<"ready" | "loading" | "error">("ready");
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    conversationRef.current?.scrollTo({
      top: conversationRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [exchanges, state]);

  async function sendQuestion(question: string) {
    setState("loading");
    setPendingQuestion(question);
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

  if (!open) {
    return (
      <button
        className={styles.launcher}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Katabang assistant"
      >
        <Sparkles aria-hidden="true" />
        <span>Ask Katabang</span>
      </button>
    );
  }

  return (
    <aside
      className={styles.panel}
      aria-label="Katabang assistant"
      aria-live="polite"
      role="dialog"
    >
      <header>
        <span className={styles.mark}>
          <Sparkles aria-hidden="true" />
        </span>
        <div>
          <strong>Katabang</strong>
          <small>Your KAILA assistant</small>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close Katabang">
          <X aria-hidden="true" />
        </button>
      </header>

      <div className={styles.conversation} ref={conversationRef}>
        {exchanges.length === 0 && !pendingQuestion && (
          <div className={styles.welcome}>
            <Sparkles aria-hidden="true" />
            <strong>How can I help?</strong>
            <p>Ask about posting jobs, comparing offers, or using KAILA.</p>
          </div>
        )}
        {exchanges.map((exchange, index) => (
          <div className={styles.exchange} key={`${exchange.question}-${index}`}>
            <p className={styles.question}>{exchange.question}</p>
            <div className={styles.answer}>
              <p>{exchange.answer.answer}</p>
              <Link href={exchange.answer.action.href}>{exchange.answer.action.label}</Link>
              <small>{exchange.answer.disclaimer}</small>
            </div>
          </div>
        ))}
        {pendingQuestion && (
          <div className={styles.exchange}>
            <p className={styles.question}>{pendingQuestion}</p>
            {state === "loading" && (
              <div className={styles.thinking} role="status">
                <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
                <span className={styles.srOnly}>Katabang is thinking…</span>
              </div>
            )}
            {state === "error" && (
              <div className={styles.error} role="alert">
                <p>Katabang is unavailable. Check your connection and try again.</p>
                <button type="button" onClick={() => void sendQuestion(pendingQuestion)}>Try again</button>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={(event) => void ask(event)}>
        <input
          ref={inputRef}
          type="text"
          value={message}
          maxLength={500}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask Katabang…"
          aria-label="Message Katabang"
        />
        <button
          type="submit"
          disabled={message.trim().length === 0 || state === "loading"}
          aria-label="Send message"
        >
          <Send aria-hidden="true" />
        </button>
      </form>
    </aside>
  );
}
