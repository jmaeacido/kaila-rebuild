"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { prepareCsrf } from "../../auth-client";
import { SUPPORT_EMAIL } from "../../../lib/support-email";
import styles from "../support.module.css";

export default function NewSupportCase() {
  const router = useRouter();
  const params = useSearchParams();
  const [category, setCategory] = useState("account");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"ready" | "saving" | "error">("ready");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState("saving");
    try {
      const token = await prepareCsrf();
      const response = await fetch("/api/v1/support/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
        body: JSON.stringify({
          category,
          subject,
          message,
          jobId: params.get("jobId") || null,
        }),
      });
      if (!response.ok) throw new Error();
      const body = (await response.json()) as { data: { id: string } };
      router.replace(`/support/${body.data.id}`);
    } catch {
      setState("error");
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div>
          <p className={styles.eyebrow}>New request</p>
          <h1>Tell us what happened</h1>
          <p>Include the details our team needs to help.</p>
        </div>
        <Link className={styles.back} href="/support">
          <ArrowLeft />
          Support
        </Link>
      </header>

      {state === "error" && (
        <div className={styles.error}>
          We couldn’t send your request. Check the details and try again, or email{" "}
          <a className={styles.link} href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </div>
      )}

      <section className={`${styles.card} ${styles.formCard}`}>
        <form className={styles.form} onSubmit={submit}>
          <label>
            What do you need help with?
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="account">Account</option>
              <option value="booking">Booking or job</option>
              <option value="payment">Payment</option>
              <option value="provider">Provider experience</option>
              <option value="technical">App problem</option>
              <option value="feedback">Feedback</option>
              <option value="other">Something else</option>
            </select>
          </label>
          <label>
            Short summary
            <input
              required
              minLength={5}
              maxLength={120}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Example: I can’t update my phone number"
            />
          </label>
          <label>
            Details
            <textarea
              required
              minLength={10}
              maxLength={4000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What happened, what did you expect, and what have you tried?"
            />
          </label>
          <button disabled={state === "saving"}>
            <Send />
            {state === "saving" ? "Sending…" : "Send to KAILA Support"}
          </button>
        </form>
        <p className={styles.emailFallback}>
          <Mail aria-hidden="true" />
          <span>
            Prefer email? Write to{" "}
            <a className={styles.link} href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            . In-app requests are easier to track.
          </span>
        </p>
      </section>
    </main>
  );
}
