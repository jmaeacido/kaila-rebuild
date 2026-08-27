"use client";

import Link from "next/link";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Feedback } from "@kaila/ui";
import { prepareCsrf } from "../auth-client";
import { notificationRoute, profilePictureReviewEvent, type NotificationRecord } from "../notification-route";
import { useRealtimeInvalidation } from "../use-realtime-invalidation";
import { notificationsChangedName } from "../notification-bell";
import { NotificationGlyph } from "../notification-glyph";
import styles from "./notifications.module.css";

type State = "loading" | "ready" | "error";

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [state, setState] = useState<State>("loading");
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/notifications", { credentials: "include", headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error();
      setItems(((await response.json()) as { data: NotificationRecord[] }).data);
      setState("ready");
    } catch { setState("error"); }
  }, []);
  useRealtimeInvalidation(() => void load(), (event) => event.type.startsWith("notification."));
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function mutate(path: string, method: "PUT" | "DELETE") {
    const token = await prepareCsrf();
    const response = await fetch(path, { method, credentials: "include", headers: { Accept: "application/json", ...(token ? { "X-XSRF-TOKEN": token } : {}) } });
    if (!response.ok) { setState("error"); return; }
    await load();
    window.dispatchEvent(new Event(notificationsChangedName));
  }

  async function open(item: NotificationRecord) {
    if (!item.readAt) await mutate(`/api/v1/notifications/${item.id}/read`, "PUT");
    const target = notificationRoute(item);
    router.push(target);
    if (target.startsWith("/account?profilePicture=review")) {
      window.dispatchEvent(new CustomEvent(profilePictureReviewEvent, { detail: {
        reviewStatus: item.data.reviewStatus,
        reviewReason: item.data.reviewReason,
      } }));
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><p>Stay up to date</p><h1>Notifications</h1><span>Job activity, messages, and important account updates.</span></div>
        {items.some((item) => !item.readAt) && <Button variant="secondary" onClick={() => void mutate("/api/v1/notifications/read", "PUT")}><CheckCheck aria-hidden="true" />Mark all read</Button>}
      </header>
      {state === "loading" && <div className={styles.skeletons} aria-label="Loading notifications"><span /><span /><span /></div>}
      {state === "error" && <Feedback kind="error" title="Notifications are unavailable"><Button variant="secondary" onClick={() => void load()}>Try again</Button></Feedback>}
      {state === "ready" && items.length === 0 && <section className={styles.empty}><Bell aria-hidden="true" /><h2>You’re all caught up</h2><p>Important updates will appear here automatically.</p></section>}
      <section className={styles.list} aria-label="Notifications">
        {items.map((item) => (
          <article className={item.readAt ? styles.read : styles.unread} key={item.id}>
            <Link href={notificationRoute(item)} onClick={(event) => { event.preventDefault(); void open(item); }}>
              <span className={styles.icon}><NotificationGlyph item={item} /></span>
              <div><h2>{item.title}</h2><p>{item.body}</p><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></div>
            </Link>
            <button type="button" aria-label={`Clear ${item.title}`} onClick={() => void mutate(`/api/v1/notifications/${item.id}`, "DELETE")}><Trash2 aria-hidden="true" /></button>
          </article>
        ))}
      </section>
    </main>
  );
}
