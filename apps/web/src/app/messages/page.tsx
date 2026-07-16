"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import Link from "next/link";
import styles from "../phase-nine.module.css";

type Conversation = { id: string; status: string; otherUser: { name: string }; requestedByMe: boolean };
export default function MessagesPage() {
  const [items, setItems] = useState<Conversation[]>([]); const [recipient, setRecipient] = useState(""); const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const load = useCallback(async () => { try { const response = await fetch("/api/v1/direct-conversations", { credentials: "include" }); if (!response.ok) throw new Error(); setItems(((await response.json()) as { data: Conversation[] }).data); setState("ready"); } catch { setState("error"); } }, []);
  useEffect(() => { void fetch("/api/v1/direct-conversations", { credentials: "include" }).then(async (response) => { if (!response.ok) throw new Error(); setItems(((await response.json()) as { data: Conversation[] }).data); setState("ready"); }).catch(() => setState("error")); }, []);
  async function requestConversation() { if (!recipient) return; setState("loading"); try { await fetch("/api/v1/auth/csrf", { credentials: "include" }); const token = document.cookie.split("; ").find((value) => value.startsWith("XSRF-TOKEN="))?.split("=")[1]; const response = await fetch("/api/v1/direct-conversations", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...(token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {}) }, body: JSON.stringify({ recipientUserId: Number(recipient) }) }); if (!response.ok) throw new Error(); setRecipient(""); await load(); } catch { setState("error"); } }
  return <main className={styles.page}><header className={styles.header}><Link href="/">Back home</Link><p className={styles.eyebrow}>Messages</p><h1>Talk before you book</h1><p>A recipient must accept your request before either person can send messages.</p></header>
    <section className={styles.card}><h2>Start a conversation</h2><div className={styles.form}><label>Recipient member ID<input inputMode="numeric" value={recipient} onChange={(event) => setRecipient(event.target.value)} /></label><Button disabled={!recipient || state === "loading"} onClick={() => void requestConversation()}>Send message request</Button></div></section>
    {state === "loading" && <div className={styles.skeleton} />}{state === "error" && <Feedback kind="error" title="Messages are unavailable">Sign in, check your connection, then try again.</Feedback>}
    {state === "ready" && items.length === 0 && <div className={styles.empty}><MessageCircle aria-hidden="true" /><h2>No conversations yet</h2><p>Your accepted message requests will appear here.</p></div>}
    {items.length > 0 && <section className={styles.grid}>{items.map((item) => <article className={styles.card} key={item.id}><h2>{item.otherUser.name}</h2><p className={styles.meta}>{item.status === "accepted" ? "Ready to message" : item.requestedByMe ? "Waiting for acceptance" : "Message request"}</p><Link className={styles.actionLink} href={`/messages/${item.id}`}>Open conversation</Link></article>)}</section>}
  </main>;
}
