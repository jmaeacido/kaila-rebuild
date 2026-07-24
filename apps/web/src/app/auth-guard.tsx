"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LogOut } from "lucide-react";
import { prepareCsrf } from "./auth-client";
import { BrandedLoader } from "./branded-loader";

const PUBLIC_PATHS = new Set([
  "/",
  "/forgot-password",
  "/login",
  "/register",
  "/reset-password",
]);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowedPath, setAllowedPath] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const isPublic = PUBLIC_PATHS.has(pathname);

  useEffect(() => {
    if (isPublic) {
      return;
    }

    let active = true;
    void fetch("/api/v1/auth/session-status", {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!active) {
          return;
        }
        if (!response.ok) {
          throw new Error("Session status request failed.");
        }
        const body = (await response.json()) as {
          data: { authenticated: boolean };
        };
        if (!body.data.authenticated) {
          const destination = `${pathname}${window.location.search}`;
          router.replace(`/login?next=${encodeURIComponent(destination)}`);
          return;
        }

        const userResponse = await fetch("/api/v1/me", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!active) {
          return;
        }
        if (!userResponse.ok) {
          throw new Error("Current user request failed.");
        }
        const userBody = (await userResponse.json()) as {
          data: { name: string; avatarUrl: string | null };
        };
        setUserName(userBody.data.name);
        setAvatarUrl(userBody.data.avatarUrl);
        setAllowedPath(pathname);
      })
      .catch(() => {
        if (active) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      });

    return () => {
      active = false;
    };
  }, [isPublic, pathname, router]);

  if (isPublic) {
    return children;
  }

  if (allowedPath !== pathname) {
    return <BrandedLoader label="Checking your KAILA session…" />;
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
    } finally {
      router.replace("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  return (
    <>
      <header className="appSessionBar">
        <Link href="/home" aria-label="KAILA home" prefetch={false}>
          <Image
            className="sessionLogo"
            src="/brand/kaila-wordmark.png"
            alt="KAILA"
            width={1102}
            height={248}
            priority
          />
        </Link>
        <div>
          <Link
            className="sessionAvatar"
            href="/account"
            aria-label="Open account"
            prefetch={false}
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
          <Link href="/home" prefetch={false}>
            <Home aria-hidden="true" />
            Home
          </Link>
          <button
            disabled={loggingOut}
            onClick={() => void signOut()}
            type="button"
          >
            <LogOut aria-hidden="true" />
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>
      {children}
    </>
  );
}
