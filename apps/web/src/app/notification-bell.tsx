"use client";

import Link from "next/link";
import { Bell, CheckCheck, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { notificationRoute, type NotificationRecord } from "./notification-route";
import { useRealtimeInvalidation } from "./use-realtime-invalidation";
import { prepareCsrf } from "./auth-client";

export const notificationsChangedName = "kaila:notifications-changed";

export function NotificationBell() {
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/v1/notifications", { credentials: "include", headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) return;
    const body = (await response.json()) as { data: NotificationRecord[]; meta: { unreadCount: number } };
    setItems(body.data.slice(0, 6));
    setUnread(body.meta.unreadCount);
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
    window.location.assign(notificationRoute(item));
  }, [load]);

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
            <div><strong>Notifications</strong><span>{unread} unread</span></div>
            {unread > 0 && <button className="notificationMarkAll" type="button" onClick={() => void markAllRead()}><CheckCheck aria-hidden="true" />Mark all as read</button>}
            <button className="notificationDropdownClose" type="button" aria-label="Close notifications" onClick={() => setOpen(false)}><X aria-hidden="true" /></button>
          </header>
          <div className="notificationDropdownList">
            {items.length === 0 ? <p className="notificationDropdownEmpty">You’re all caught up.</p> : items.map((item) => (
              <Link className={item.readAt ? "" : "unread"} href={notificationRoute(item)} key={item.id} onClick={(event) => { event.preventDefault(); void openNotification(item); }}>
                <span aria-hidden="true" />
                <div><strong>{item.title}</strong><p>{item.body}</p><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></div>
              </Link>
            ))}
          </div>
          <Link className="notificationSeeAll" href="/notifications" onClick={() => setOpen(false)}>See all notifications <ChevronRight aria-hidden="true" /></Link>
        </section>
      )}
    </div>
  );
}
