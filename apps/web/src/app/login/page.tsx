"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@kaila/ui";
import {
  ApiError,
  prepareCsrf,
  safeDestination,
} from "../auth-client";
import styles from "../auth.module.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destination = safeDestination(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/v1/me", {
      credentials: "include",
      headers: { Accept: "application/json" },
    }).then((response) => {
      if (response.ok) {
        router.replace(destination);
      }
    });
  }, [destination, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const token = await prepareCsrf();
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const body = (await response.json()) as ApiError;
        setMessage(
          body.error?.message ?? "We couldn’t sign you in. Please try again.",
        );
        return;
      }

      router.replace(destination);
      router.refresh();
    } catch {
      setMessage("Sign in is unavailable right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      title="Welcome back"
      description="Sign in to post jobs, send offers, message, and manage your work."
    >
      <form className={styles.form} onSubmit={(event) => void submit(event)}>
        <label>
          Email
          <input
            autoComplete="username"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label>
          Password
          <span className={styles.passwordControl}>
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
              type="button"
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </span>
        </label>
        {message && (
          <p className={styles.formError} role="alert">
            {message}
          </p>
        )}
        <Button
          className={styles.submit}
          disabled={!email || !password}
          isLoading={loading}
          type="submit"
        >
          <LogIn aria-hidden="true" />
          Sign in
        </Button>
      </form>
      <p className={styles.switch}>
        New to KAILA?{" "}
        <Link
          href={`/register?next=${encodeURIComponent(destination)}`}
        >
          Create an account
        </Link>
      </p>
    </AuthFrame>
  );
}

function AuthFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className={styles.page}>
      <aside className={styles.brandPanel}>
        <div>
          <Image
            src="/brand/kaila-wordmark.png"
            alt="KAILA"
            width={1102}
            height={248}
            priority
          />
          <h2>Local work starts with trust.</h2>
          <p>
            One secure account for clients finding help and providers growing
            their local reputation.
          </p>
          <div className={styles.benefits}>
            <span><CheckCircle2 aria-hidden="true" />Post and manage jobs</span>
            <span><CheckCircle2 aria-hidden="true" />Compare offers clearly</span>
            <span><CheckCircle2 aria-hidden="true" />Keep messages in one place</span>
          </div>
        </div>
      </aside>
      <section className={styles.formSide}>
        <div className={styles.card}>
          <header className={styles.cardHeader}>
            <Link href="/" aria-label="Back to KAILA home">
              <Image
                src="/brand/kaila-wordmark.png"
                alt="KAILA"
                width={1102}
                height={248}
                priority
              />
            </Link>
            <h1>{title}</h1>
            <p>{description}</p>
          </header>
          {children}
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
