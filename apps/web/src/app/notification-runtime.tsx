"use client";

import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Bell, CheckCircle2, Construction, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { prepareCsrf } from "./auth-client";
import {
  MatchOpportunityAvatar,
  MatchOpportunityDetails,
  MatchOpportunityPrompt,
} from "./match-opportunity-prompt";
import {
  feedbackForDomainEvent,
  isEphemeralRealtimeEvent,
  isNotificationBackedRealtimeEvent,
  type FeedbackMessage,
} from "./notification-feedback";
import { playNotificationSound, soundForNotification, unlockNotificationSounds } from "./notification-sounds";
import {
  clearStoredMaintenanceCountdown,
  maintenanceCountdownClearName,
  readStoredMaintenanceCountdown,
  writeStoredMaintenanceCountdown,
} from "./maintenance-countdown-storage";
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

type Toast = FeedbackMessage & { id: number; eventKey?: string; permissionPrompt?: boolean };

const LIVE_UPDATES_TOAST_KEY = "kaila.liveUpdatesAnnounced";

function formatCountdown(endsAt: number, now: number): string {
  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function liveUpdatesAlreadyAnnounced(): boolean {
  try {
    return window.sessionStorage.getItem(LIVE_UPDATES_TOAST_KEY) === "1";
  } catch {
    return false;
  }
}

function markLiveUpdatesAnnounced(): void {
  try {
    window.sessionStorage.setItem(LIVE_UPDATES_TOAST_KEY, "1");
  } catch {
    // Private mode still suppresses repeats within this JS lifetime via the module flag below.
  }
}

let liveUpdatesAnnouncedThisTab = false;

function isNativeAndroid(): boolean {
  const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return capacitor?.isNativePlatform?.() === true;
}

export function NotificationRuntime() {
  const router = useRouter();
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const nextId = useRef(0);
  const seenEventKeys = useRef(new Set<string>());
  const liveConnected = useRef(false);
  const hideToasts = pathname === "/maintenance";

  const dismiss = useCallback((id: number) => {
    setToasts((current) => {
      const target = current.find((toast) => toast.id === id);
      // Countdown stays until the window activates, cancels, or ends.
      if (target?.kind === "maintenance-countdown") return current;
      if (target?.kind === "live-updates-connected") {
        liveUpdatesAnnouncedThisTab = true;
        markLiveUpdatesAnnounced();
      }
      return current.filter((toast) => toast.id !== id);
    });
  }, []);

  const show = useCallback((message: FeedbackMessage & { eventKey?: string; permissionPrompt?: boolean }) => {
    const id = ++nextId.current;
    setToasts((current) => {
      if (message.kind === "maintenance-countdown" && message.maintenanceEndsAt) {
        writeStoredMaintenanceCountdown({
          eventKey: message.eventKey || `maintenance-${message.maintenanceScheduledAt || message.maintenanceEndsAt}`,
          title: message.title,
          body: message.body,
          scheduledAt: message.maintenanceScheduledAt ?? null,
          endsAt: message.maintenanceEndsAt,
        });
      }

      if (message.eventKey && seenEventKeys.current.has(message.eventKey)) {
        const maintenanceVisible = current.some((toast) => toast.kind === "maintenance-countdown");
        if (!message.kind?.startsWith("maintenance") || maintenanceVisible) {
          return current;
        }
      }
      if (message.eventKey) {
        seenEventKeys.current.add(message.eventKey);
        if (seenEventKeys.current.size > 500) {
          const oldest = seenEventKeys.current.values().next().value;
          if (oldest) seenEventKeys.current.delete(oldest);
        }
      }
      const withoutStaleMaintenance = message.kind?.startsWith("maintenance")
        ? current.filter((toast) => !toast.kind?.startsWith("maintenance"))
        : current;
      const next = [...withoutStaleMaintenance, { ...message, id }];
      // Durable notification dialogs stay ahead of brief status toasts.
      next.sort((left, right) => Number(Boolean(right.persistent || right.permissionPrompt)) - Number(Boolean(left.persistent || left.permissionPrompt)));
      return next.slice(-19);
    });
  }, []);

  useEffect(() => {
    const stored = readStoredMaintenanceCountdown();
    if (!stored) return;
    show({
      eventKey: stored.eventKey,
      title: stored.title,
      body: stored.body,
      persistent: true,
      eyebrow: "PLATFORM NOTICE",
      kind: "maintenance-countdown",
      maintenanceScheduledAt: stored.scheduledAt ?? undefined,
      maintenanceEndsAt: stored.endsAt,
    });
  }, [show]);

  useEffect(() => {
    const clearPinned = () => {
      clearStoredMaintenanceCountdown();
      setToasts((current) => current.filter((toast) => !toast.kind?.startsWith("maintenance")));
    };
    window.addEventListener(maintenanceCountdownClearName, clearPinned);
    return () => window.removeEventListener(maintenanceCountdownClearName, clearPinned);
  }, []);

  useEffect(() => {
    const hasCountdown = toasts.some((toast) => toast.kind === "maintenance-countdown" && toast.maintenanceEndsAt);
    if (!hasCountdown) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [toasts]);

  useEffect(() => {
    const countdown = toasts.find((toast) => toast.kind === "maintenance-countdown" && toast.maintenanceEndsAt);
    if (!countdown?.maintenanceEndsAt) return;
    if (countdown.maintenanceEndsAt > Date.now()) return;
    // Scheduler also activates; client navigates when the toast hits zero or activated event arrives.
  }, [now, toasts]);

  useEffect(() => {
    const active = toasts[0];
    if (!active || active.permissionPrompt || active.persistent) return;
    const timer = window.setTimeout(() => dismiss(active.id), 6_000);
    return () => window.clearTimeout(timer);
  }, [dismiss, toasts]);

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
    const unlock = () => unlockNotificationSounds();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const domainEvent = (event: Event) => {
      const detail = (event as CustomEvent<DomainEvent>).detail;
      if (
        detail.type === "platform.maintenance.activated"
        || detail.type === "platform.maintenance.cancelled"
        || detail.type === "platform.maintenance.ended"
      ) {
        clearStoredMaintenanceCountdown();
        setToasts((current) => current.filter((toast) => !toast.kind?.startsWith("maintenance")));
      }
      if (detail.type === "platform.maintenance.activated") {
        const raw = typeof detail.data.message === "string" ? detail.data.message : "";
        const message = raw && !/finish what you are doing|will pause briefly/i.test(raw)
          ? raw
          : "We are improving the marketplace. Please check back soon — your jobs and messages will be waiting.";
        router.replace(`/maintenance?message=${encodeURIComponent(message)}`);
      }
      if (detail.type === "notification.created") {
        const notification = detail.data.notification;
        if (notification && typeof notification === "object") {
          const record = notification as { type?: string; data?: { type?: string; hideFromInbox?: string | boolean } };
          if (record.data?.hideFromInbox !== "1" && record.data?.hideFromInbox !== true && typeof record.type === "string") {
            playNotificationSound(soundForNotification(record.type, typeof record.data?.type === "string" ? record.data.type : null));
          }
        }
      } else if (
        !detail.type.startsWith("call.")
        && !isEphemeralRealtimeEvent(detail.type)
        && !isNotificationBackedRealtimeEvent(detail.type)
      ) {
        // Typing/reacts are conversation-scoped; durable events chime via notification.created.
        playNotificationSound(soundForNotification(detail.type));
      }
      const feedback = feedbackForDomainEvent(detail);
      if (feedback) show({ ...feedback, eventKey: feedback.eventKey ?? detail.eventId });
    };
    window.addEventListener(domainEventName, domainEvent);
    return () => window.removeEventListener(domainEventName, domainEvent);
  }, [router, show]);

  useEffect(() => {
    const statusChanged = (event: Event) => {
      const status = (event as CustomEvent<RealtimeStatus>).detail;
      if (status === "connected") {
        const firstConnect = !liveConnected.current;
        liveConnected.current = true;
        if (
          firstConnect
          && !liveUpdatesAnnouncedThisTab
          && !liveUpdatesAlreadyAnnounced()
        ) {
          liveUpdatesAnnouncedThisTab = true;
          markLiveUpdatesAnnounced();
          show({
            kind: "live-updates-connected",
            title: "Live updates connected",
            body: "Messages, offers, calls, and job changes will update automatically.",
          });
        }
      } else if (status === "disconnected" && liveConnected.current) {
        liveConnected.current = false;
        // Intentional short gaps (public pages / ticket refresh) should stay quiet.
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

  const maintenanceToast = hideToasts ? undefined : toasts.find((toast) => toast.kind === "maintenance-countdown");
  const primaryToast = hideToasts
    ? undefined
    : toasts.find((toast) => toast.kind !== "maintenance-countdown" && toast.kind !== "maintenance-active");

  if (hideToasts) return null;

  return (
    <aside className="toastViewport" aria-live="polite" aria-label="KAILA updates">
      {maintenanceToast ? (
        <section
          className="appToast appToastDialog appToastPinned"
          key={maintenanceToast.id}
          role="status"
          aria-live="polite"
          aria-labelledby={`realtime-update-${maintenanceToast.id}`}
        >
          <span className="appToastIcon" aria-hidden="true"><Construction /></span>
          <div>
            {maintenanceToast.eyebrow ? <p className="appToastEyebrow">{maintenanceToast.eyebrow}</p> : null}
            <strong id={`realtime-update-${maintenanceToast.id}`}>{maintenanceToast.title}</strong>
            <p>{maintenanceToast.body}</p>
            {maintenanceToast.maintenanceEndsAt ? (
              <p className="appToastCountdown" aria-live="polite">
                Starts in <strong>{formatCountdown(maintenanceToast.maintenanceEndsAt, now)}</strong>
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
      {primaryToast?.matchJobId ? (
          <MatchOpportunityPrompt jobId={primaryToast.matchJobId} key={primaryToast.id}>
            {({ opportunity, status }) => (
              <section
                className="appToast appToastDialog appToastMatch"
                role="dialog"
                aria-modal="false"
                aria-labelledby={`realtime-update-${primaryToast.id}`}
              >
                <span className="appToastIcon appToastAvatar" aria-hidden={opportunity?.client.avatarUrl ? undefined : true}>
                  <MatchOpportunityAvatar opportunity={opportunity} />
                  {!opportunity ? <CheckCircle2 aria-hidden="true" /> : null}
                </span>
                <div>
                  {primaryToast.eyebrow ? <p className="appToastEyebrow">{primaryToast.eyebrow}</p> : null}
                  <strong id={`realtime-update-${primaryToast.id}`}>{opportunity?.title || primaryToast.title}</strong>
                  {opportunity ? <p>{opportunity.client.displayName}</p> : <p>{primaryToast.body}</p>}
                  <MatchOpportunityDetails opportunity={opportunity} status={status} />
                  {primaryToast.href ? (
                    <Link href={primaryToast.href} onClick={() => dismiss(primaryToast.id)}>
                      {primaryToast.actionLabel || "View job"}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
                <button className="appToastClose" type="button" aria-label={`Dismiss ${primaryToast.title}`} onClick={() => dismiss(primaryToast.id)}><X /></button>
              </section>
            )}
          </MatchOpportunityPrompt>
        ) : primaryToast ? (
          <section
            className={primaryToast.persistent || primaryToast.permissionPrompt ? "appToast appToastDialog" : "appToast"}
            key={primaryToast.id}
            role="dialog"
            aria-modal="false"
            aria-labelledby={`realtime-update-${primaryToast.id}`}
          >
            <span className="appToastIcon" aria-hidden="true">
              {primaryToast.permissionPrompt ? <Bell /> : primaryToast.kind?.startsWith("maintenance") ? <Construction /> : <CheckCircle2 />}
            </span>
            <div>
              {primaryToast.eyebrow ? <p className="appToastEyebrow">{primaryToast.eyebrow}</p> : null}
              <strong id={`realtime-update-${primaryToast.id}`}>{primaryToast.title}</strong>
              <p>{primaryToast.body}</p>
              {primaryToast.permissionPrompt ? (
                <button type="button" onClick={() => void registerBrowserPush().catch(() => show({ title: "Push setup failed", body: "Check browser notification permissions and try again." }))}>Enable notifications</button>
              ) : primaryToast.href ? (
                <Link href={primaryToast.href} onClick={() => dismiss(primaryToast.id)}>
                  {primaryToast.actionLabel || "View update"}
                  <ArrowRight aria-hidden="true" />
                </Link>
              ) : null}
            </div>
            <button className="appToastClose" type="button" aria-label={`Dismiss ${primaryToast.title}`} onClick={() => dismiss(primaryToast.id)}><X /></button>
          </section>
        ) : null}
    </aside>
  );
}
