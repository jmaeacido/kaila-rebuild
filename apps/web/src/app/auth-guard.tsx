"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BrandMark } from "../components/brand-mark";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { prepareCsrf } from "./auth-client";
import { BrandedLoader } from "./branded-loader";
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

const PUBLIC_PATHS = new Set([
  "/",
  "/forgot-password",
  "/login",
  "/privacy",
  "/register",
  "/reset-password",
  "/terms",
  "/account-deletion",
  "/maintenance",
  "/faqs",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return pathname.startsWith("/status/");
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { applyAccountTheme } = useTheme();
  const [sessionReady, setSessionReady] = useState(false);
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const isPublic = isPublicPath(pathname);

  useEffect(() => {
    if (isPublic) {
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
        const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
        if (capacitor?.isNativePlatform?.()) {
          void ensureMobileSession(window.location.origin).catch(() => undefined);
        }
      })
      .catch(() => {
        if (active) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      });

    return () => {
      active = false;
    };
  }, [applyAccountTheme, isPublic, pathname, router, sessionReady]);

  if (isPublic) {
    return children;
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
        <>
          <PullToRefresh />
          <header className="appSessionBar">
            <Link href="/home" aria-label="KAILA home">
              <BrandMark className="sessionLogo" priority />
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
          {children}
        </>
      ) : (
        <BrandedLoader label="Getting KAILA ready for you…" />
      )}
    </CallProvider>
  );
}
