"use client";

import { initializeMobileRuntime } from "@kaila/mobile/runtime";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AndroidUpdatePrompt } from "./android-update-prompt";

const apiOrigin = process.env.NEXT_PUBLIC_KAILA_API_ORIGIN ?? windowOrigin();
const appHost = process.env.NEXT_PUBLIC_KAILA_APP_HOST ?? "app.kaila-app.com";

function windowOrigin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

export function NativeRuntime() {
  const router = useRouter();

  useEffect(() => {
    const viewport = window.visualViewport;
    const updateViewport = () => {
      const height = viewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--kaila-viewport-height", `${Math.round(height)}px`);
      document.documentElement.toggleAttribute(
        "data-keyboard-open",
        Boolean(viewport && window.innerHeight - viewport.height > 120),
      );
    };
    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    return () => {
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
      document.documentElement.style.removeProperty("--kaila-viewport-height");
      document.documentElement.removeAttribute("data-keyboard-open");
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.getRegistrations().then((registrations) =>
      Promise.all(
        registrations
          .filter((registration) => {
            const worker = registration.active ?? registration.waiting ?? registration.installing;
            return new URL(registration.scope).origin === window.location.origin
              && !worker?.scriptURL.endsWith("/firebase-messaging-sw.js");
          })
          .map((registration) => registration.unregister()),
      ),
    );

    if ("caches" in window) {
      void caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("kaila-"))
            .map((key) => caches.delete(key)),
        ),
      );
    }
  }, []);

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

  return <AndroidUpdatePrompt />;
}
