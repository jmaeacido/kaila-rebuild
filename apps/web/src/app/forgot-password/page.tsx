"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@kaila/ui";
import { ApiError, prepareCsrf, safeDestination } from "../auth-client";
import { AuthFrame } from "../auth-frame";
import styles from "../auth.module.css";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const destination = safeDestination(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

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
      const body = (await response.json()) as ApiError & {
        data?: { message?: string };
      };

      if (!response.ok) {
        setError(
          body.error?.message ??
            "We couldn’t send reset instructions. Please try again.",
        );
        return;
      }

      setMessage(
        body.data?.message ??
          "If an account matches that email, reset instructions are on the way.",
      );
    } catch {
      setError("Password recovery is unavailable right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(destination)}`;

  return (
    <AuthFrame
      title="Reset your password"
      description="Enter your account email and we’ll send you a secure reset link."
    >
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
        {error && <p className={styles.formError} role="alert">{error}</p>}
        {message && (
          <p className={styles.formSuccess} role="status">
            {message}
          </p>
        )}
        <div className={styles.formActions}>
          <Button
            className={styles.submit}
            disabled={!email}
            isLoading={loading}
            type="submit"
          >
            <Mail aria-hidden="true" />
            Send reset link
          </Button>
          <Link className={styles.backLink} href={loginHref}>
            <ArrowLeft aria-hidden="true" />
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthFrame>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
