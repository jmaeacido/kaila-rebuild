"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  CircleHelp,
  Mail,
  MessageCircleQuestion,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import { SUPPORT_EMAIL } from "../../lib/support-email";
import { useRealtimeInvalidation } from "../use-realtime-invalidation";
import styles from "./support.module.css";

type SupportCase = {
  id: string;
  reference: string;
  subject: string;
  status: string;
  unread: boolean;
  lastMessageAt: string;
};

const status = (value: string) =>
  ({
    open: "Open",
    waiting_for_support: "Waiting for support",
    waiting_for_customer: "Waiting for you",
    resolved: "Resolved",
    closed: "Closed",
  }[value] ?? value);

const activeStatuses = new Set(["open", "waiting_for_support", "waiting_for_customer"]);

export default function SupportPage() {
  const [items, setItems] = useState<SupportCase[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/support/cases", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setItems(((await response.json()) as { data: SupportCase[] }).data);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useRealtimeInvalidation(
    () => void load(),
    (event) => event.type.startsWith("support."),
  );

  const activeCount = items.filter((item) => activeStatuses.has(item.status)).length;

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div>
          <p className={styles.eyebrow}>Customer care</p>
          <h1>Support</h1>
          <p>Get help from the right KAILA team.</p>
        </div>
        <Link className={styles.back} href="/account">
          <ArrowLeft />
          Account
        </Link>
      </header>

      <section className={styles.hero} aria-labelledby="support-intro-title">
        <div className={styles.heroSymbol} aria-hidden="true"><Wrench /></div>
        <h2 id="support-intro-title">How can we help?</h2>
        <p>
          Send us a message about your account, booking, payment, or app experience.
          Your request stays here so you can follow every update.
        </p>
        <div className={styles.heroActions}>
          <Link className={styles.primary} href="/support/new">
            <Plus />
            New support request
          </Link>
          <a className={styles.heroEmail} href={`mailto:${SUPPORT_EMAIL}`}>
            <Mail />
            Prefer email? {SUPPORT_EMAIL}
          </a>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={`${styles.card} ${styles.helpCard}`}>
          <h2>Choose the right help</h2>
          <div className={styles.choices}>
            <Link className={styles.choice} href="/faqs">
              <CircleHelp />
              <div>
                <strong>FAQs</strong>
                <p>Common questions about hiring and offering services</p>
              </div>
              <ChevronRight />
            </Link>
            <Link className={styles.choice} href="/help/katabang">
              <Sparkles />
              <div>
                <strong>Ask Katabang</strong>
                <p>Quick guidance on using KAILA</p>
              </div>
              <ChevronRight />
            </Link>
            <Link className={styles.choice} href="/safety">
              <ShieldAlert />
              <div>
                <strong>Safety concern</strong>
                <p>Report scams, threats, or unsafe conduct</p>
              </div>
              <ChevronRight />
            </Link>
          </div>
        </article>

        <article className={`${styles.card} ${styles.requestsCard}`}>
          <div className={styles.sectionHeading}>
            <div><h2>Your requests</h2>{state === "ready" && items.length > 0 && <p>{activeCount} active</p>}</div>
            <Link className={styles.newRequestLink} href="/support/new" aria-label="Start another support request"><Plus aria-hidden="true" />New</Link>
          </div>
          {state === "loading" && <div className={styles.requestSkeletons} aria-label="Loading your requests" aria-busy="true"><div className={styles.skeleton} /><div className={styles.skeleton} /></div>}
          {state === "error" && (
            <div className={styles.error}>
              We couldn’t load your requests.{" "}
              <button className={styles.retry} type="button" onClick={() => void load()}>
                <RefreshCw aria-hidden="true" />Try again
              </button>
            </div>
          )}
          {state === "ready" && items.length === 0 && (
            <div className={styles.emptyRequests}>
              <MessageCircleQuestion aria-hidden="true" />
              <strong>No requests yet</strong>
              <p className={styles.muted}>When you contact support, updates will appear here.</p>
              <Link className={styles.link} href="/support/new">
                Start a request
              </Link>
            </div>
          )}
          {items.length > 0 && (
            <div className={styles.caseList}>
              {items.map((item) => (
                <Link
                  className={`${styles.card} ${styles.case}`}
                  href={`/support/${item.id}`}
                  key={item.id}
                  aria-label={`${item.subject}, ${item.unread ? "new reply" : status(item.status)}`}
                >
                  <div>
                    <strong>{item.subject}</strong>
                    <p className={styles.meta}>{item.reference}</p>
                    <time dateTime={item.lastMessageAt}>
                      Updated {new Date(item.lastMessageAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </time>
                  </div>
                  <span className={styles.badge} data-status={item.unread ? "unread" : item.status}>
                    {item.unread ? "New reply" : status(item.status)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
