"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Mail, RefreshCw } from "lucide-react";
import { prepareCsrf } from "../auth-client";
import styles from "../page.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">(
    "idle",
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");

    try {
      const token = await prepareCsrf();
      const response = await fetch("/api/v1/auth/password/forgot", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
        body: JSON.stringify({ email }),
      });
      setState(response.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <main className={styles.authPage}>
      <section className={styles.authCard}>
        <div className={styles.authIcon}>
          <Image
            src="/brand/kaila-app-icon.png"
            alt=""
            width={533}
            height={556}
            priority
          />
        </div>
        <p className={styles.eyebrow}>KAILA ADMINISTRATION</p>
        <h1>Reset your password</h1>
        <p className={styles.supporting}>
          Enter your administrator email and we’ll send a secure reset link.
        </p>
        <form className={styles.form} onSubmit={(event) => void submit(event)}>
          <label>
            Email
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          {state === "sent" && (
            <p className={styles.formSuccess} role="status">
              If that account exists, a reset link is on its way.
            </p>
          )}
          {state === "error" && (
            <p className={styles.formError} role="alert">
              We couldn’t send the reset link. Please try again.
            </p>
          )}
          <button
            className={styles.primaryButton}
            disabled={state === "loading"}
            type="submit"
          >
            {state === "loading" ? (
              <RefreshCw aria-hidden="true" className={styles.spinner} />
            ) : (
              <Mail aria-hidden="true" />
            )}
            {state === "loading" ? "Sending…" : "Send reset link"}
          </button>
          <Link className={styles.textLink} href="/">
            <ArrowLeft aria-hidden="true" /> Back to sign in
          </Link>
        </form>
      </section>
    </main>
  );
}
