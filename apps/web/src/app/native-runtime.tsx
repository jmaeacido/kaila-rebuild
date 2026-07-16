"use client";

import { initializeMobileRuntime } from "@kaila/mobile/runtime";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const apiOrigin = process.env.NEXT_PUBLIC_KAILA_API_ORIGIN ?? windowOrigin();
const appHost = process.env.NEXT_PUBLIC_KAILA_APP_HOST ?? "app.kaila-app.com";

function windowOrigin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

export function NativeRuntime() {
  const router = useRouter();
  useEffect(() => {
    let cleanup: (() => Promise<void>) | undefined;
    void initializeMobileRuntime({
      apiOrigin,
      appHost,
      navigate: (path) => router.push(path),
      onConnectivity: (online) => window.dispatchEvent(new CustomEvent("kaila:connectivity", { detail: { online } })),
    }).then((dispose) => { cleanup = dispose; });
    return () => { void cleanup?.(); };
  }, [router]);
  return null;
}
