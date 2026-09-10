"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { BrandMark } from "../components/brand-mark";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { fetchWithTimeout, prepareCsrf } from "./auth-client";
import { BrandedLoader } from "./branded-loader";
import { InitialUiGate } from "./initial-ui-gate";
import { FloatingKatabang } from "../components/floating-katabang";
import { MarketplaceDesktopNav } from "../components/marketplace-navigation";
import { SessionMenu } from "../components/session-menu";
import { AreaMismatchBanner } from "../components/area-mismatch-banner";
import { CallProvider } from "./calls/call-provider";
import { NotificationBell } from "./notification-bell";
import { PullToRefresh } from "./pull-to-refresh";
import { realtimeAuthChangedName } from "./realtime-provider";
import { useTheme } from "./theme-provider";
import { isThemePreference } from "./theme";
import { clearSession, ensureMobileSession } from "@kaila/mobile/session";
import { isPublicPath, normalizePublicPath } from "./public-routes";
import { sessionUserChangedEvent } from "./session-user";
import { Button, Feedback } from "@kaila/ui";
import { LogIn, RefreshCw } from "lucide-react";

const SESSION_AWARE_PUBLIC_PATHS = new Set(["/faqs"]);

type PublicSessionStatus = "checking" | "authenticated" | "anonymous";
type SessionState = "checking" | "authenticated" | "error";

const PublicSessionContext = createContext<PublicSessionStatus>("anonymous");

export function usePublicSessionStatus(): PublicSessionStatus {
  return useContext(PublicSessionContext);
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = normalizePublicPath(usePathname());
  const router = useRouter();
  const { applyAccountTheme } = useTheme();
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [userName, setUserName] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const isPublic = isPublicPath(pathname);
  const isSessionAwarePublic = SESSION_AWARE_PUBLIC_PATHS.has(pathname);
  const [publicSessionStatus, setPublicSessionStatus] = useState<PublicSessionStatus>(
    isSessionAwarePublic ? "checking" : "anonymous",
  );
  const showKatabang = pathname !== "/help/katabang" && pathname !== "/provider-profile";

  useEffect(() => {
    const ready = (isPublic && !isSessionAwarePublic) || sessionState === "error";
    document.documentElement.dataset.kailaAppReady = ready ? "true" : "false";
    return () => {
      delete document.documentElement.dataset.kailaAppReady;
    };
  }, [isPublic, isSessionAwarePublic, sessionState]);

  useEffect(() => {
    if (isPublic && !isSessionAwarePublic) {
      return;
    }
    if (sessionState !== "checking") return;

    let active = true;
    void fetchWithTimeout("/api/v1/me", {
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!active) {
          return;
        }
        if (!response.ok) {
          if (response.status !== 401 && response.status !== 419) {
            throw new Error("Current user request failed.");
          }
          void clearSession().catch(() => undefined);
          if (isSessionAwarePublic) {
            setPublicSessionStatus("anonymous");
            return;
          }
          if (isPublicPath(pathname)) return;
          const destination = `${pathname}${window.location.search}`;
          router.replace(`/login?next=${encodeURIComponent(destination)}`);
          return;
        }
        const userBody = (await response.json()) as {
          data: {
            name: string;
            avatarUrl: string | null;
            providerAvatarUrl?: string | null;
            displayAvatarUrl?: string | null;
            appearanceTheme?: string;
          };
        };
        setUserName(userBody.data.name);
        if (isThemePreference(userBody.data.appearanceTheme)) {
          applyAccountTheme(userBody.data.appearanceTheme);
        }
        setSessionState("authenticated");
        if (isSessionAwarePublic) setPublicSessionStatus("authenticated");
        const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
        if (capacitor?.isNativePlatform?.()) {
          void ensureMobileSession(window.location.origin).catch(() => undefined);
        }
      })
      .catch(() => {
        if (active) {
          if (isSessionAwarePublic) {
            setPublicSessionStatus("anonymous");
            return;
          }
          if (isPublicPath(pathname)) return;
          setSessionState("error");
        }
      });

    return () => {
      active = false;
    };
  }, [applyAccountTheme, isPublic, isSessionAwarePublic, pathname, router, sessionAttempt, sessionState]);

  useEffect(() => {
    if (sessionState !== "authenticated") return;

    const refreshSessionUser = () => {
      void fetch("/api/v1/me", {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      })
        .then(async (response) => {
          if (!response.ok) return;
          const userBody = (await response.json()) as { data: { name: string } };
          setUserName(userBody.data.name);
        })
        .catch(() => undefined);
    };

    window.addEventListener(sessionUserChangedEvent, refreshSessionUser);
    return () => window.removeEventListener(sessionUserChangedEvent, refreshSessionUser);
  }, [sessionState]);

  if (isPublic && !isSessionAwarePublic) {
    return children;
  }

  if (isSessionAwarePublic && sessionState !== "authenticated") {
    return (
      <PublicSessionContext.Provider value={publicSessionStatus}>
        {children}
      </PublicSessionContext.Provider>
    );
  }

  async function signOut() {
    setLoggingOut(true);
    try {
      const token = await Promise.race([
        prepareCsrf(),
        new Promise<undefined>((resolve) => {
          window.setTimeout(() => resolve(undefined), 5_000);
        }),
      ]);
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
        signal: AbortSignal.timeout(8_000),
        headers: {
          Accept: "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
      }).catch(() => undefined);
      await Promise.race([
        clearSession().catch(() => undefined),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, 2_000);
        }),
      ]);
    } finally {
      setSessionState("checking");
      window.dispatchEvent(new CustomEvent<boolean>(realtimeAuthChangedName, { detail: false }));
      router.replace("/login");
      router.refresh();
    }
  }

  if (loggingOut) {
    return <BrandedLoader label="Signing you out of KAILA…" />;
  }

  if (sessionState === "error") {
    const destination = `${pathname}${typeof window === "undefined" ? "" : window.location.search}`;
    return (
      <main className="sessionRecovery" data-kaila-app-ready="true">
        <Feedback kind="error" title="We couldn’t finish signing you in">
          <p>Check your connection, then try again or return to sign in.</p>
          <div className="sessionRecoveryActions">
            <Button
              onClick={() => {
                setSessionState("checking");
                setSessionAttempt((attempt) => attempt + 1);
              }}
              type="button"
            >
              <RefreshCw aria-hidden="true" />
              Try again
            </Button>
            <Button
              onClick={() => router.replace(`/login?next=${encodeURIComponent(destination)}`)}
              type="button"
              variant="secondary"
            >
              <LogIn aria-hidden="true" />
              Sign in
            </Button>
          </div>
        </Feedback>
      </main>
    );
  }

  return (
    <CallProvider>
      {sessionState === "authenticated" ? (
        <InitialUiGate key={pathname}>
          <PullToRefresh />
          <header className="appSessionBar">
            <Link href="/home" aria-label="KAILA home">
              <BrandMark className="sessionLogo" priority showBull />
            </Link>
            <MarketplaceDesktopNav />
            <div className="appSessionBarActions">
              <span className="sessionName">{userName}</span>
              <NotificationBell />
              {showKatabang && <FloatingKatabang />}
              <SessionMenu loggingOut={loggingOut} onSignOut={() => void signOut()} />
            </div>
          </header>
          <AreaMismatchBanner />
          <PublicSessionContext.Provider value="authenticated">
            {children}
          </PublicSessionContext.Provider>
        </InitialUiGate>
      ) : (
        <BrandedLoader label="Getting KAILA ready for you…" />
      )}
    </CallProvider>
  );
}
