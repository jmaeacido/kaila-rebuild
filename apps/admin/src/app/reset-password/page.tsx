"use client";

import { FormEvent, Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ApiError, prepareCsrf } from "../auth-client";
import styles from "../page.module.css";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [state, setState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const confirmationEntered = confirmation.length > 0;
  const passwordsMatch = password === confirmation;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");

    try {
      const csrf = await prepareCsrf();
      const response = await fetch("/api/v1/auth/password/reset", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(csrf ? { "X-XSRF-TOKEN": csrf } : {}),
        },
        body: JSON.stringify({
          email,
          token,
          password,
          password_confirmation: confirmation,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as ApiError;
        setMessage(
          body.error?.message ?? "This reset link is invalid or expired.",
        );
        setState("error");
        return;
      }

      setState("success");
    } catch {
      setMessage("Your password could not be reset. Please try again.");
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
        <h1>Choose a new password</h1>
        {state === "success" ? (
          <>
            <p className={styles.formSuccess} role="status">
              <CheckCircle2 aria-hidden="true" /> Your password is ready.
            </p>
            <Link className={styles.textLink} href="/">
              Continue to sign in
            </Link>
          </>
        ) : (
          <form className={styles.form} onSubmit={(event) => void submit(event)}>
            <label>
              New password
              <span className={styles.passwordControl}>
                <input
                  autoComplete="new-password"
                  minLength={12}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={
                    showPassword ? "Hide new password" : "Show new password"
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                  tabIndex={-1}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>
            <label>
              Confirm new password
              <span className={styles.passwordControl}>
                <input
                  autoComplete="new-password"
                  minLength={12}
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                  type={showConfirmation ? "text" : "password"}
                  value={confirmation}
                />
                <button
                  aria-label={
                    showConfirmation
                      ? "Hide password confirmation"
                      : "Show password confirmation"
                  }
                  aria-pressed={showConfirmation}
                  onClick={() => setShowConfirmation((visible) => !visible)}
                  tabIndex={-1}
                  type="button"
                >
                  {showConfirmation ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>
            {confirmationEntered && (
              <p
                aria-live="polite"
                className={
                  passwordsMatch ? styles.formSuccess : styles.formError
                }
              >
                {passwordsMatch ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <XCircle aria-hidden="true" />
                )}
                {passwordsMatch
                  ? "Passwords match."
                  : "Passwords do not match yet."}
              </p>
            )}
            {state === "error" && (
              <>
                <p className={styles.formError} role="alert">
                  {message}
                </p>
                <Link className={styles.textLink} href="/forgot-password">
                  Request a new reset link
                </Link>
              </>
            )}
            <button
              className={styles.primaryButton}
              disabled={
                state === "loading" ||
                !email ||
                !token ||
                !confirmationEntered ||
                !passwordsMatch
              }
              type="submit"
            >
              {state === "loading" ? (
                <RefreshCw aria-hidden="true" className={styles.spinner} />
              ) : (
                <KeyRound aria-hidden="true" />
              )}
              {state === "loading" ? "Saving…" : "Save new password"}
            </button>
            <Link className={styles.textLink} href="/">
              <ArrowLeft aria-hidden="true" />
              Back to sign in
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
