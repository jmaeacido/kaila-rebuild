"use client";

import { Bell, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { io, type Socket } from "socket.io-client";
import { adminNotificationRoute } from "../admin-notification-routes";
import styles from "./admin-notification-center.module.css";

type AdminNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  resourceType: string;
  resourceId: string;
  data: Record<string, string | undefined>;
  readAt: string | null;
  createdAt: string;
};

type DomainEvent = {
  type: string;
  data?: Record<string, unknown>;
};

function routeFor(notification: AdminNotification): string {
  return adminNotificationRoute({
    ...notification.data,
    eventType: notification.type,
    resourceType: notification.resourceType,
  });
}

async function csrfToken(): Promise<string | undefined> {
  await fetch("/api/v1/auth/csrf", { credentials: "include" });
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];
  return value ? decodeURIComponent(value) : undefined;
}

export function AdminNotificationCenter() {
  const router = useRouter();
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<AdminNotification | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const knownIds = useRef(new Set<string>());

  const reconcile = useCallback(async (announceNew = false) => {
    const response = await fetch("/api/v1/notifications", {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;
    const body = (await response.json()) as {
      data: AdminNotification[];
      meta: { unreadCount: number };
    };
    if (announceNew) {
      const latest = body.data.find((item) => !item.readAt && !knownIds.current.has(item.id));
      if (latest) setToast(latest);
    }
    knownIds.current = new Set(body.data.map((item) => item.id));
    setItems(body.data);
    setUnreadCount(body.meta.unreadCount);
  }, []);

  useEffect(() => {
    let disposed = false;
    let socket: Socket | null = null;
    void reconcile();

    const connect = async () => {
      try {
        const response = await fetch("/api/v1/realtime/ticket", {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!response.ok || disposed) return;
        const body = (await response.json()) as { data: { ticket: string } };
        const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL
          || (process.env.NODE_ENV === "development"
            ? `${window.location.protocol}//${window.location.hostname}:3100`
            : window.location.origin);
        socket = io(realtimeUrl, {
          auth: { ticket: body.data.ticket },
          transports: ["polling", "websocket"],
        });
        socket.on("connect", () => void reconcile(true));
        socket.on("domain.event", (event: DomainEvent, acknowledge?: () => void) => {
          acknowledge?.();
          if (event.type === "notification.created") {
            void reconcile(true);
          } else if (event.type.startsWith("support.")) {
            router.refresh();
          }
        });
      } catch {
        // Focus reconciliation recovers when realtime is temporarily unavailable.
      }
    };

    const onFocus = () => void reconcile(true);
    window.addEventListener("focus", onFocus);
    void connect();
    return () => {
      disposed = true;
      window.removeEventListener("focus", onFocus);
      socket?.disconnect();
    };
  }, [reconcile, router]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 10_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openNotification = async (notification: AdminNotification) => {
    setOpen(false);
    setToast(null);
    router.push(routeFor(notification));
    router.refresh();
    if (!notification.readAt) {
      void csrfToken()
        .then((token) => fetch(`/api/v1/notifications/${encodeURIComponent(notification.id)}/read`, {
          method: "PUT",
          credentials: "include",
          headers: { Accept: "application/json", ...(token ? { "X-XSRF-TOKEN": token } : {}) },
        }))
        .then(() => reconcile())
        .catch(() => undefined);
    }
  };

  return (
    <div className={styles.center}>
      <button
        className={styles.bell}
        type="button"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell aria-hidden="true" />
        {unreadCount > 0 && <span>{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {open && (
        <section className={styles.panel} aria-label="Admin notifications">
          <header><strong>Notifications</strong><span>{unreadCount} unread</span></header>
          <div className={styles.list}>
            {items.length === 0 && <p>No notifications yet.</p>}
            {items.slice(0, 20).map((item) => (
              <button key={item.id} type="button" data-unread={!item.readAt || undefined} onClick={() => void openNotification(item)}>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {portalReady && toast && createPortal(
        <aside className={styles.toast} role="status" aria-live="polite">
          <button className={styles.dismiss} type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}>
            <X aria-hidden="true" />
          </button>
          <strong>{toast.title}</strong>
          <p>{toast.body}</p>
          <button className={styles.view} type="button" onClick={() => void openNotification(toast)}>View request</button>
        </aside>,
        document.body,
      )}
    </div>
  );
}
