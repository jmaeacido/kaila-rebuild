"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LogOut } from "lucide-react";
import { prepareCsrf } from "./auth-client";

const PUBLIC_PATHS = new Set(["/", "/login", "/register"]);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowedPath, setAllowedPath] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const isPublic = PUBLIC_PATHS.has(pathname);

  useEffect(() => {
    if (isPublic) {
      return;
    }

    let active = true;
    void fetch("/api/v1/me", {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!active) {
          return;
        }
        if (response.ok) {
          const body = (await response.json()) as { data: { name: string } };
          setUserName(body.data.name);
          setAllowedPath(pathname);
          return;
        }
        const destination = `${pathname}${window.location.search}`;
        router.replace(`/login?next=${encodeURIComponent(destination)}`);
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
    return (
      <main className="authGuardLoading" aria-live="polite">
        <Image
          src="/brand/kaila-app-icon.png"
          alt=""
          width={533}
          height={556}
          priority
        />
        <p>Checking your KAILA session…</p>
      </main>
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
    } finally {
      router.replace("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  return (
    <>
      <header className="appSessionBar">
        <Link href="/" aria-label="KAILA home">
          <Image
            src="/brand/kaila-wordmark.png"
            alt="KAILA"
            width={1102}
            height={248}
            priority
          />
        </Link>
        <div>
          <span>{userName}</span>
          <Link href="/">
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
