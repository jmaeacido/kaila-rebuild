"use client";

import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { notificationRoute, type NotificationRecord } from "./notification-route";
import { useRealtimeInvalidation } from "./use-realtime-invalidation";

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
          <header><strong>Notifications</strong><span>{unread} unread</span></header>
          <div className="notificationDropdownList">
            {items.length === 0 ? <p className="notificationDropdownEmpty">You’re all caught up.</p> : items.map((item) => (
              <Link className={item.readAt ? "" : "unread"} href={notificationRoute(item)} key={item.id} onClick={() => setOpen(false)}>
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
