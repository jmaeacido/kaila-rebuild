"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BriefcaseBusiness,
  Eye,
  EyeOff,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import { Button } from "@kaila/ui";
import {
  ApiError,
  prepareCsrf,
  safeDestination,
} from "../auth-client";
import styles from "../auth.module.css";
import { SocialLogin } from "../social-login";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProvider = searchParams.get("role") === "provider";
  const requestedDestination = safeDestination(searchParams.get("next"), "");
  const [role, setRole] = useState<"client" | "provider">(
    initialProvider ? "provider" : "client",
  );
  const [fields, setFields] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirmation: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false);
  const [policy, setPolicy] = useState<{
    termsVersion: string;
    privacyVersion: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/v1/auth/session-status", {
      credentials: "include",
      headers: { Accept: "application/json" },
    }).then(async (response) => {
      if (!response.ok) {
        return;
      }
      const body = (await response.json()) as {
        data: { authenticated: boolean };
      };
      if (body.data.authenticated) {
        router.replace(requestedDestination || "/post-job");
      }
    });
  }, [requestedDestination, router]);

  useEffect(() => {
    void fetch("/api/v1/auth/registration-config", {
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Registration configuration failed.");
        }
        const body = (await response.json()) as {
          data: { termsVersion: string; privacyVersion: string };
        };
        setPolicy(body.data);
      })
      .catch(() =>
        setMessage("Registration is unavailable right now. Please try again."),
      );
  }, []);

  function update(name: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!policy) {
      setMessage("Registration is unavailable right now. Please try again.");
      return;
    }
    setLoading(true);
    setErrors({});
    setMessage("");

    try {
      const token = await prepareCsrf();
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
        body: JSON.stringify({
          name: fields.name,
          email: fields.email,
          password: fields.password,
          password_confirmation: fields.passwordConfirmation,
          termsVersion: policy.termsVersion,
          privacyVersion: policy.privacyVersion,
          providerIntent: role === "provider",
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as ApiError;
        setErrors(body.error?.fields ?? {});
        setMessage(
          body.error?.message ?? "We couldn’t create your account.",
        );
        return;
      }

      const fallback = role === "provider" ? "/provider-profile" : "/";
      router.replace(requestedDestination || fallback);
      router.refresh();
    } catch {
      setMessage("Registration is unavailable right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
          <h2>One account. Two ways to get things done.</h2>
          <p>
            Find trusted help as a client or turn your skills into nearby work
            as a provider.
          </p>
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
            <h1>Create your KAILA account</h1>
            <p>Choose how you want to begin. You can switch modes later.</p>
          </header>
          <form className={styles.form} onSubmit={(event) => void submit(event)}>
            <fieldset className={styles.fieldGroup}>
              <legend>I want to start as a</legend>
              <div className={styles.roleOptions}>
                <label>
                  <input
                    checked={role === "client"}
                    name="role"
                    onChange={() => setRole("client")}
                    type="radio"
                  />
                  <UserRound aria-hidden="true" />
                  <strong>Client</strong>
                  <span>I need local help</span>
                </label>
                <label>
                  <input
                    checked={role === "provider"}
                    name="role"
                    onChange={() => setRole("provider")}
                    type="radio"
                  />
                  <BriefcaseBusiness aria-hidden="true" />
                  <strong>Provider</strong>
                  <span>I want local work</span>
                </label>
              </div>
            </fieldset>
            <label>
              Full name
              <input
                autoComplete="name"
                onChange={(event) => update("name", event.target.value)}
                required
                value={fields.name}
              />
              {errors.name && <span className={styles.fieldError}>{errors.name[0]}</span>}
            </label>
            <label>
              Email
              <input
                autoComplete="email"
                inputMode="email"
                onChange={(event) => update("email", event.target.value)}
                required
                type="email"
                value={fields.email}
              />
              {errors.email && <span className={styles.fieldError}>{errors.email[0]}</span>}
            </label>
            <label>
              Password
              <span className={styles.passwordControl}>
                <input
                  autoComplete="new-password"
                  minLength={12}
                  onChange={(event) => update("password", event.target.value)}
                  required
                  type={showPassword ? "text" : "password"}
                  value={fields.password}
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
              <span className={styles.fieldError}>
                Use at least 12 characters.
              </span>
            </label>
            <label>
              Confirm password
              <span className={styles.passwordControl}>
                <input
                  autoComplete="new-password"
                  minLength={12}
                  onChange={(event) =>
                    update("passwordConfirmation", event.target.value)
                  }
                  required
                  type={showPasswordConfirmation ? "text" : "password"}
                  value={fields.passwordConfirmation}
                />
                <button
                  aria-label={
                    showPasswordConfirmation
                      ? "Hide confirmed password"
                      : "Show confirmed password"
                  }
                  aria-pressed={showPasswordConfirmation}
                  onClick={() =>
                    setShowPasswordConfirmation((visible) => !visible)
                  }
                  type="button"
                >
                  {showPasswordConfirmation ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </button>
              </span>
              {errors.password && <span className={styles.fieldError}>{errors.password[0]}</span>}
            </label>
            <label className={styles.consent}>
              <input
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                required
                type="checkbox"
              />
              <span>
                I agree to KAILA’s Terms and Privacy Policy for this account.
              </span>
            </label>
            {message && (
              <p className={styles.formError} role="alert">
                {message}
              </p>
            )}
            <Button
              className={styles.submit}
              disabled={
                !accepted ||
                !policy ||
                !fields.name ||
                !fields.email ||
                fields.password.length < 12 ||
                fields.password !== fields.passwordConfirmation
              }
              isLoading={loading}
              type="submit"
            >
              <UserRoundPlus aria-hidden="true" />
              Create account
            </Button>
          </form>
          <SocialLogin
            destination={
              requestedDestination ||
              (role === "provider" ? "/provider-profile" : "/")
            }
            providerIntent={role === "provider"}
          />
          <p className={styles.switch}>
            Already registered?{" "}
            <Link
              href={`/login?next=${encodeURIComponent(
                requestedDestination || "/",
              )}`}
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
