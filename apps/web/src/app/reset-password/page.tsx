"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@kaila/ui";
import { ApiError, prepareCsrf } from "../auth-client";
import { AuthFrame } from "../auth-frame";
import styles from "../auth.module.css";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const linkIsValid = Boolean(token && email);
  const passwordsMatch = password === confirmation;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!linkIsValid || password.length < 12 || !passwordsMatch) {
      return;
    }
    setLoading(true);
    setError("");

    try {
      const csrfToken = await prepareCsrf();
      const response = await fetch("/api/v1/auth/password/reset", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
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
        setError(
          body.error?.message ??
            "We couldn’t reset your password. Request a new link and try again.",
        );
        return;
      }

      router.replace("/login?passwordReset=1");
    } catch {
      setError("Password reset is unavailable right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      title="Choose a new password"
      description="Use at least 12 characters that you don’t use on another account."
    >
      <form className={styles.form} onSubmit={(event) => void submit(event)}>
        {!linkIsValid ? (
          <p className={styles.formError} role="alert">
            This password reset link is incomplete. Request a new link to
            continue.
          </p>
        ) : (
          <>
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
                  aria-label={showPassword ? "Hide new password" : "Show new password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </span>
              <span className={styles.fieldError}>Use at least 12 characters.</span>
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
                  aria-label={showConfirmation ? "Hide confirmed password" : "Show confirmed password"}
                  aria-pressed={showConfirmation}
                  onClick={() => setShowConfirmation((visible) => !visible)}
                  type="button"
                >
                  {showConfirmation ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </span>
              {confirmation && !passwordsMatch && (
                <span className={styles.fieldError}>Passwords do not match.</span>
              )}
            </label>
          </>
        )}
        {error && <p className={styles.formError} role="alert">{error}</p>}
        <div className={styles.formActions}>
          {linkIsValid && (
            <Button
              className={styles.submit}
              disabled={password.length < 12 || !passwordsMatch}
              isLoading={loading}
              type="submit"
            >
              <KeyRound aria-hidden="true" />
              Save new password
            </Button>
          )}
          <Link className={styles.backLink} href="/forgot-password">
            <ArrowLeft aria-hidden="true" />
            Request a new link
          </Link>
        </div>
      </form>
    </AuthFrame>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
