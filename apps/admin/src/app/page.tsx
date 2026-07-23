"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import {
  Check,
  Eye,
  EyeOff,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Tags,
  X,
} from "lucide-react";
import Image from "next/image";
import styles from "./page.module.css";

type Provider = { id: number; display_name: string; bio: string };
type Credential = { id: number; label: string; type: string };
type Asset = {
  id: string;
  original_name: string;
  mime_type: string;
};
type QueueData = {
  providers: Provider[];
  credentials: Credential[];
  assets: Asset[];
};
type ViewState = "loading" | "ready" | "signed-out" | "forbidden" | "error";
type QueueResult =
  | { state: "ready"; data: QueueData }
  | { state: "signed-out" | "forbidden" };

function csrfToken(): string | undefined {
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : undefined;
}

export default function AdminHome() {
  const [queue, setQueue] = useState<QueueData>({
    providers: [],
    credentials: [],
    assets: [],
  });
  const [state, setState] = useState<ViewState>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState("");

  const requestQueue = useCallback(async (): Promise<QueueResult> => {
    const response = await fetch("/api/v1/admin/marketplace/review-queue", {
      credentials: "include",
    });

    if (response.status === 401) {
      return { state: "signed-out" };
    }
    if (response.status === 403) {
      return { state: "forbidden" };
    }
    if (!response.ok) {
      throw new Error("Review queue request failed.");
    }

    const body = (await response.json()) as { data: QueueData };
    return { state: "ready", data: body.data };
  }, []);

  const applyQueueResult = useCallback((result: QueueResult) => {
    if (result.state === "ready") {
      setQueue(result.data);
    }
    setState(result.state);
  }, []);

  const load = useCallback(async () => {
    setState("loading");
    try {
      applyQueueResult(await requestQueue());
    } catch {
      setState("error");
    }
  }, [applyQueueResult, requestQueue]);

  useEffect(() => {
    void requestQueue().then(applyQueueResult).catch(() => setState("error"));
  }, [applyQueueResult, requestQueue]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigningIn(true);
    setLoginMessage("");

    try {
      await fetch("/api/v1/auth/csrf", { credentials: "include" });
      const token = csrfToken();
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setLoginMessage(
          response.status === 422
            ? "The email or password is incorrect."
            : "Sign in is unavailable right now. Please try again.",
        );
        return;
      }

      setPassword("");
      await load();
    } catch {
      setLoginMessage("Sign in is unavailable right now. Please try again.");
    } finally {
      setSigningIn(false);
    }
  }

  async function review(
    kind: "providers" | "credentials" | "assets",
    id: number | string,
    approve: boolean,
  ) {
    await fetch("/api/v1/auth/csrf", { credentials: "include" });
    const token = csrfToken();
    const url =
      kind === "providers"
        ? `/api/v1/admin/marketplace/providers/${id}/status`
        : kind === "credentials"
          ? `/api/v1/admin/marketplace/credentials/${id}/review`
          : `/api/v1/admin/marketplace/assets/${id}/scan`;
    const body =
      kind === "providers"
        ? { status: approve ? "active" : "rejected" }
        : kind === "credentials"
          ? { reviewStatus: approve ? "approved" : "rejected" }
          : { scanStatus: approve ? "clean" : "rejected" };

    const response = await fetch(url, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-XSRF-TOKEN": token } : {}),
      },
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      setState("signed-out");
      return;
    }

    await load();
  }

  async function signOut() {
    setLoggingOut(true);
    setLogoutMessage("");

    try {
      await fetch("/api/v1/auth/csrf", { credentials: "include" });
      const token = csrfToken();
      const response = await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: token ? { "X-XSRF-TOKEN": token } : {},
      });

      if (!response.ok && response.status !== 401) {
        throw new Error("Logout request failed.");
      }

      setQueue({ providers: [], credentials: [], assets: [] });
      setEmail("");
      setPassword("");
      setState("signed-out");
    } catch {
      setLogoutMessage("You could not be signed out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (state === "signed-out") {
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
          <h1>Sign in to review</h1>
          <p className={styles.supporting}>
            Use an authorized administrator account to continue.
          </p>
          <form className={styles.form} onSubmit={(event) => void signIn(event)}>
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
                  {showPassword ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>
            {loginMessage && (
              <p className={styles.formError} role="alert">
                {loginMessage}
              </p>
            )}
            <button
              className={styles.primaryButton}
              disabled={signingIn}
              type="submit"
            >
              {signingIn ? (
                <RefreshCw aria-hidden="true" className={styles.spinner} />
              ) : (
                <LogIn aria-hidden="true" />
              )}
              {signingIn ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header>
        <div>
          <Image
            className={styles.adminLogo}
            src="/brand/kaila-wordmark.png"
            alt="KAILA"
            width={1102}
            height={248}
            priority
          />
          <p>KAILA ADMINISTRATION</p>
          <h1>Marketplace review</h1>
        </div>
        <div className={styles.headerActions}>
          <button disabled={loggingOut} onClick={() => void load()}>
            <RefreshCw aria-hidden="true" />
            Refresh
          </button>
          <button
            className={styles.logoutButton}
            disabled={loggingOut}
            onClick={() => void signOut()}
          >
            {loggingOut ? (
              <RefreshCw aria-hidden="true" className={styles.spinner} />
            ) : (
              <LogOut aria-hidden="true" />
            )}
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>
      {logoutMessage && (
        <div className={styles.error} role="alert">
          {logoutMessage}
        </div>
      )}
      {state === "forbidden" && (
        <div className={styles.error} role="alert">
          This account does not have administrator access.
        </div>
      )}
      {state === "error" && (
        <div className={styles.error} role="alert">
          The review queue could not be loaded. Check the API connection and
          try again.
        </div>
      )}
      {state === "loading" && (
        <div className={styles.loading}>Loading review queue…</div>
      )}
      {state === "ready" && (
        <div className={styles.columns}>
          <Queue
            empty="No files need scan review."
            icon={<ShieldCheck />}
            title="Safety scans"
          >
            {queue.assets.map((asset) => (
              <article key={asset.id}>
                <h3>{asset.original_name}</h3>
                <p>{asset.mime_type}</p>
                <Actions
                  onChoose={(approve) =>
                    void review("assets", asset.id, approve)
                  }
                />
              </article>
            ))}
          </Queue>
          <Queue
            empty="No provider profiles need review."
            icon={<ShieldCheck />}
            title="Provider profiles"
          >
            {queue.providers.map((provider) => (
              <article key={provider.id}>
                <h3>{provider.display_name}</h3>
                <p>{provider.bio}</p>
                <Actions
                  onChoose={(approve) =>
                    void review("providers", provider.id, approve)
                  }
                />
              </article>
            ))}
          </Queue>
          <Queue
            empty="No credentials need review."
            icon={<Tags />}
            title="Credentials"
          >
            {queue.credentials.map((credential) => (
              <article key={credential.id}>
                <h3>{credential.label}</h3>
                <p>{credential.type}</p>
                <Actions
                  onChoose={(approve) =>
                    void review("credentials", credential.id, approve)
                  }
                />
              </article>
            ))}
          </Queue>
        </div>
      )}
    </main>
  );
}

function Queue({
  title,
  icon,
  empty,
  children,
}: {
  title: string;
  icon: ReactNode;
  empty: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2>
        {icon}
        {title}
      </h2>
      {Array.isArray(children) && children.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        children
      )}
    </section>
  );
}

function Actions({
  onChoose,
}: {
  onChoose: (approve: boolean) => void;
}) {
  return (
    <div className={styles.actions}>
      <button
        className={styles.approve}
        onClick={() => onChoose(true)}
        type="button"
      >
        <Check aria-hidden="true" />
        Approve
      </button>
      <button
        className={styles.reject}
        onClick={() => onChoose(false)}
        type="button"
      >
        <X aria-hidden="true" />
        Reject
      </button>
    </div>
  );
}
