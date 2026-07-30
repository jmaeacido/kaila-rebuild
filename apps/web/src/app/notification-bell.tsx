"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRealtimeInvalidation } from "./use-realtime-invalidation";

export const notificationsChangedName = "kaila:notifications-changed";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    const response = await fetch("/api/v1/notifications", { credentials: "include", headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) return;
    const body = (await response.json()) as { meta: { unreadCount: number } };
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

  return (
    <Link className="notificationBell" href="/notifications" aria-label={unread ? `${unread} unread notifications` : "Notifications"} prefetch={false}>
      <Bell aria-hidden="true" />
      {unread > 0 && <span aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
    </Link>
  );
}
