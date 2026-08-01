"use client";

import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, X } from "lucide-react";
import { prepareCsrf } from "./auth-client";
import { feedbackForDomainEvent, type FeedbackMessage } from "./notification-feedback";
import { domainEventName, realtimeStatusName, type DomainEvent, type RealtimeStatus } from "./realtime-provider";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const firebaseConfigured = Object.values(firebaseConfig).every((value) => typeof value === "string" && value !== "");

type Toast = FeedbackMessage & { id: number; permissionPrompt?: boolean };

function isNativeAndroid(): boolean {
  const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return capacitor?.isNativePlatform?.() === true;
}

export function NotificationRuntime() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((message: FeedbackMessage & { permissionPrompt?: boolean }) => {
    const id = ++nextId.current;
    setToasts((current) => [...current.slice(-2), { ...message, id }]);
    if (!message.permissionPrompt) window.setTimeout(() => dismiss(id), 6_000);
  }, [dismiss]);

  const registerBrowserPush = useCallback(async (showFeedback = true) => {
    if (!firebaseConfigured || isNativeAndroid() || !(await isSupported())) return;
    const permission = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
    if (permission !== "granted") {
      if (showFeedback) {
        show({ title: "Notifications are off", body: "Enable notifications in your browser settings to receive updates." });
      }
      return;
    }
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    const token = await getToken(getMessaging(app), { serviceWorkerRegistration: registration });
    if (!token) throw new Error("FCM_TOKEN_UNAVAILABLE");
    const csrf = await prepareCsrf();
    const response = await fetch("/api/v1/push-devices", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(csrf ? { "X-XSRF-TOKEN": csrf } : {}),
      },
      body: JSON.stringify({ platform: "web", token }),
    });
    if (!response.ok) throw new Error("PUSH_REGISTRATION_FAILED");
    setToasts((current) => current.filter((toast) => !toast.permissionPrompt));
    if (showFeedback) {
      show({ title: "Notifications enabled", body: "KAILA updates can now reach this browser." });
    }
  }, [show]);

  useEffect(() => {
    const domainEvent = (event: Event) => {
      const feedback = feedbackForDomainEvent((event as CustomEvent<DomainEvent>).detail);
      if (feedback) show(feedback);
    };
    window.addEventListener(domainEventName, domainEvent);
    return () => window.removeEventListener(domainEventName, domainEvent);
  }, [show]);

  useEffect(() => {
    let wasConnected = false;
    const statusChanged = (event: Event) => {
      const status = (event as CustomEvent<RealtimeStatus>).detail;
      if (status === "connected") {
        if (!wasConnected) show({ title: "Live updates connected", body: "Messages, offers, calls, and job changes will update automatically." });
        wasConnected = true;
      } else if (status === "disconnected" && wasConnected) {
        show({ title: "Live updates reconnecting", body: "KAILA will reconcile missed updates when the connection returns." });
      }
    };
    window.addEventListener(realtimeStatusName, statusChanged);
    return () => window.removeEventListener(realtimeStatusName, statusChanged);
  }, [show]);

  useEffect(() => {
    const mirrored = new WeakSet<Element>();
    const mirrorSuccess = (root: ParentNode) => {
      const candidates = root instanceof Element && root.matches(".kaila-feedback--success")
        ? [root]
        : Array.from(root.querySelectorAll(".kaila-feedback--success"));
      for (const feedback of candidates) {
        if (mirrored.has(feedback)) continue;
        mirrored.add(feedback);
        const title = feedback.querySelector(".kaila-feedback__title")?.textContent?.trim();
        const body = feedback.querySelector(".kaila-feedback__title + div")?.textContent?.trim();
        if (title && body) show({ title, body });
      }
    };
    mirrorSuccess(document);
    const observer = new MutationObserver((records) => records.forEach((record) =>
      record.addedNodes.forEach((node) => { if (node instanceof Element) mirrorSuccess(node); }),
    ));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [show]);

  useEffect(() => {
    if (!firebaseConfigured || isNativeAndroid() || !("Notification" in window) || !("serviceWorker" in navigator)) return;
    let unsubscribe: (() => void) | undefined;
    void isSupported().then(async (supported) => {
      if (!supported) return;
      if (Notification.permission === "granted") {
        await registerBrowserPush(false).catch(() => undefined);
      }
      const app = getApps()[0] ?? initializeApp(firebaseConfig);
      unsubscribe = onMessage(getMessaging(app), (payload) => {
        show({ title: payload.notification?.title || "KAILA update", body: payload.notification?.body || "Open KAILA to see what changed.", href: "/notifications" });
      });
    });
    return () => unsubscribe?.();
  }, [registerBrowserPush, show]);

  return (
    <aside className="toastViewport" aria-live="polite" aria-label="KAILA updates">
      {toasts.map((toast) => (
        <section className="appToast" key={toast.id}>
          <span className="appToastIcon" aria-hidden="true">{toast.permissionPrompt ? <Bell /> : <CheckCircle2 />}</span>
          <div><strong>{toast.title}</strong><p>{toast.body}</p>
            {toast.permissionPrompt ? <button type="button" onClick={() => void registerBrowserPush().catch(() => show({ title: "Push setup failed", body: "Check browser notification permissions and try again." }))}>Enable notifications</button>
              : toast.href ? <Link href={toast.href}>View update</Link> : null}
          </div>
          <button className="appToastClose" type="button" aria-label="Dismiss" onClick={() => dismiss(toast.id)}><X /></button>
        </section>
      ))}
    </aside>
  );
}
