"use client";

import Link from "next/link";
import { Bell, CheckCheck, ChevronRight, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notificationRoute, type NotificationRecord } from "./notification-route";
import { useRealtimeInvalidation } from "./use-realtime-invalidation";
import { prepareCsrf } from "./auth-client";
import { NotificationGlyph } from "./notification-glyph";

export const notificationsChangedName = "kaila:notifications-changed";

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const container = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/notifications", { credentials: "include", headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error();
      const body = (await response.json()) as { data: NotificationRecord[]; meta: { unreadCount: number } };
      setItems(body.data.slice(0, 6));
      setUnread(body.meta.unreadCount);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useRealtimeInvalidation(() => void load(), (event) => event.type.startsWith("notification."));

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    const changed = () => void load();
    window.addEventListener(notificationsChangedName, changed);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(notificationsChangedName, changed);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const openNotification = useCallback(async (item: NotificationRecord) => {
    setOpen(false);
    if (!item.readAt) {
      const readAt = new Date().toISOString();
      setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, readAt } : candidate));
      setUnread((current) => Math.max(0, current - 1));
      try {
        const token = await prepareCsrf();
        const response = await fetch(`/api/v1/notifications/${item.id}/read`, {
          method: "PUT",
          credentials: "include",
          keepalive: true,
          headers: { Accept: "application/json", ...(token ? { "X-XSRF-TOKEN": token } : {}) },
        });
        if (!response.ok) throw new Error();
        window.dispatchEvent(new Event(notificationsChangedName));
      } catch {
        void load();
      }
    }
    router.push(notificationRoute(item));
  }, [load, router]);

  const markAllRead = useCallback(async () => {
    if (unread === 0) return;
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => item.readAt ? item : { ...item, readAt }));
    setUnread(0);
    try {
      const token = await prepareCsrf();
      const response = await fetch("/api/v1/notifications/read", {
        method: "PUT",
        credentials: "include",
        headers: { Accept: "application/json", ...(token ? { "X-XSRF-TOKEN": token } : {}) },
      });
      if (!response.ok) throw new Error();
      window.dispatchEvent(new Event(notificationsChangedName));
    } catch {
      void load();
    }
  }, [load, unread]);

  return (
    <div className="notificationMenu" ref={container}>
      <button
        className="notificationBell"
        type="button"
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        aria-expanded={open}
        aria-controls="notification-dropdown"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell aria-hidden="true" />
        {unread > 0 && <span aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <section className="notificationDropdown" id="notification-dropdown" aria-label="Recent notifications">
          <header>
            <div><h2>Notifications</h2><span>{unread === 0 ? "You’re all caught up" : `${unread} unread`}</span></div>
            {unread > 0 && <button className="notificationMarkAll" type="button" onClick={() => void markAllRead()}><CheckCheck aria-hidden="true" />Mark all as read</button>}
            <button className="notificationDropdownClose" type="button" aria-label="Close notifications" onClick={() => setOpen(false)}><X aria-hidden="true" /></button>
          </header>
          <div className="notificationDropdownList">
            {state === "loading" && <div className="notificationDropdownLoading" aria-label="Loading notifications"><span /><span /></div>}
            {state === "error" && <div className="notificationDropdownEmpty"><Bell aria-hidden="true" /><strong>Couldn’t load updates</strong><p>Check your connection and try again.</p><button type="button" onClick={() => void load()}><RefreshCw aria-hidden="true" />Try again</button></div>}
            {state === "ready" && items.length === 0 && <div className="notificationDropdownEmpty"><Bell aria-hidden="true" /><strong>No new notifications</strong><p>Job, message, and support updates will appear here.</p></div>}
            {state === "ready" && items.map((item) => (
              <Link className={item.readAt ? "" : "unread"} href={notificationRoute(item)} key={item.id} onClick={(event) => { event.preventDefault(); void openNotification(item); }}>
                <span className="notificationItemIcon"><NotificationGlyph item={item} /></span>
                <div><strong>{item.title}</strong><p>{item.body}</p><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></div>
                <ChevronRight className="notificationItemChevron" aria-hidden="true" />
              </Link>
            ))}
          </div>
          <Link className="notificationSeeAll" href="/notifications" onClick={() => setOpen(false)}><span>See all notifications</span><ChevronRight aria-hidden="true" /></Link>
        </section>
      )}
    </div>
  );
}
