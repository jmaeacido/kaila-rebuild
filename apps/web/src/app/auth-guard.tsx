"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Image from "next/image";
import { BrandMark } from "../components/brand-mark";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { prepareCsrf } from "./auth-client";
import { BrandedLoader } from "./branded-loader";
import { InitialUiGate } from "./initial-ui-gate";
import { FloatingKatabang } from "../components/floating-katabang";
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

const SESSION_AWARE_PUBLIC_PATHS = new Set(["/faqs"]);

type PublicSessionStatus = "checking" | "authenticated" | "anonymous";

const PublicSessionContext = createContext<PublicSessionStatus>("anonymous");

export function usePublicSessionStatus(): PublicSessionStatus {
  return useContext(PublicSessionContext);
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = normalizePublicPath(usePathname());
  const router = useRouter();
  const { applyAccountTheme } = useTheme();
  const [sessionReady, setSessionReady] = useState(false);
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const isPublic = isPublicPath(pathname);
  const isSessionAwarePublic = SESSION_AWARE_PUBLIC_PATHS.has(pathname);
  const [publicSessionStatus, setPublicSessionStatus] = useState<PublicSessionStatus>(
    isSessionAwarePublic ? "checking" : "anonymous",
  );

  useEffect(() => {
    if (isPublic && !isSessionAwarePublic) {
      return;
    }
    if (sessionReady) return;

    let active = true;
    void fetch("/api/v1/me", {
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!active) {
          return;
        }
        if (!response.ok) {
          if (response.status !== 401) throw new Error("Current user request failed.");
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
          data: { name: string; avatarUrl: string | null; appearanceTheme?: string };
        };
        setUserName(userBody.data.name);
        setAvatarUrl(userBody.data.avatarUrl);
        if (isThemePreference(userBody.data.appearanceTheme)) {
          applyAccountTheme(userBody.data.appearanceTheme);
        }
        setSessionReady(true);
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
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      });

    return () => {
      active = false;
    };
  }, [applyAccountTheme, isPublic, isSessionAwarePublic, pathname, router, sessionReady]);

  if (isPublic && !isSessionAwarePublic) {
    return children;
  }

  if (isSessionAwarePublic && !sessionReady) {
    return (
      <PublicSessionContext.Provider value={publicSessionStatus}>
        {children}
      </PublicSessionContext.Provider>
    );
  }

  async function signOut() {
    setLoggingOut(true);
    try {
      const token = await prepareCsrf();
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
      });
      await clearSession().catch(() => undefined);
    } finally {
      setSessionReady(false);
      window.dispatchEvent(new CustomEvent<boolean>(realtimeAuthChangedName, { detail: false }));
      router.replace("/login");
      router.refresh();
    }
  }

  if (loggingOut) {
    return <BrandedLoader label="Signing you out of KAILA…" />;
  }

  return (
    <CallProvider>
      {sessionReady ? (
        <InitialUiGate key={pathname}>
          <PullToRefresh />
          <header className="appSessionBar">
            <Link href="/home" aria-label="KAILA home">
              <BrandMark className="sessionLogo" priority showBull />
            </Link>
            <div>
              <Link
                className="sessionAvatar"
                href="/account"
                aria-label="Open account"
              >
                <span aria-hidden="true">{userName.charAt(0).toUpperCase()}</span>
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt=""
                    width={44}
                    height={44}
                    unoptimized
                  />
                ) : null}
              </Link>
              <span className="sessionName">{userName}</span>
              <NotificationBell />
              {pathname !== "/help/katabang" && <FloatingKatabang />}
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
