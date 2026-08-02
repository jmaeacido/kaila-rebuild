/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, use, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Paperclip,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Plus,
  Send,
  ShieldCheck,
  Smile,
  Video,
  X,
} from "lucide-react";
import styles from "../hired.module.css";
import { AttachmentSourceActions } from "../../../../../components/attachment-picker";
import { useCall } from "../../../../calls/call-provider";
import { domainEventName, type DomainEvent } from "../../../../realtime-provider";
import { isEphemeralRealtimeEvent } from "../../../../notification-feedback";
import { useRealtimeInvalidation } from "../../../../use-realtime-invalidation";
import { MediaViewer, type ViewableMedia } from "../../../../../components/media-viewer";

type Asset = {
  id: string;
  name: string;
  mimeType: string;
  scanStatus: "pending" | "clean" | "rejected" | "failed";
  url: string | null;
};
type Message = {
  id: string;
  sequence: number;
  senderUserId: number;
  body: string | null;
  createdAt: string;
  assets: Asset[];
  reactions: Record<string, number>;
  viewerReactions: string[];
};
type Conversation = {
  id: string;
  viewerUserId: number;
  otherParty: { id: number; name: string; avatarUrl: string | null };
  messages: Message[];
  calls: CallLog[];
};
type CallLog = {
  id: string;
  media: "audio" | "video";
  status: string;
  viewerDirection: "incoming" | "outgoing";
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  endedReason: string | null;
  durationSeconds: number | null;
};

const emojiGroups = [
  { label: "Smileys", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😍", "🥰", "😘", "😋", "😎", "🤩", "🥳", "😏", "😢", "😭", "😡", "🤔", "🫡", "😴", "🤗"] },
  { label: "Gestures", emojis: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "👏", "🙌", "👐", "🤝", "🙏", "💪", "👋", "🫶", "☝️", "👇", "👉", "👈"] },
  { label: "Hearts and celebrations", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "💕", "💖", "✨", "🎉", "🎊", "🎂", "🎁", "🏆", "⭐", "🔥"] },
  { label: "Work and places", emojis: ["🔧", "🔨", "🪛", "🧰", "🧹", "🪠", "⚡", "💡", "🏠", "📍", "🚗", "🏍️", "✅", "❌", "⚠️", "📞", "💬", "📸", "💵", "🕐"] },
  { label: "People and activities", emojis: ["👶", "🧒", "👩", "👨", "👵", "👴", "👷", "🧑‍🔧", "🧑‍🏫", "🧑‍🍳", "🧑‍💻", "🏃", "🚶", "💃", "🕺", "⚽", "🏀", "🏐", "🎮", "🎵"] },
  { label: "Animals and nature", emojis: ["🐶", "🐱", "🐭", "🐰", "🦊", "🐻", "🐼", "🐸", "🐵", "🐔", "🐦", "🦋", "🌸", "🌻", "🌴", "🌵", "☀️", "🌤️", "🌧️", "🌈"] },
  { label: "Food and drink", emojis: ["🍎", "🍌", "🍉", "🍇", "🍓", "🥭", "🍔", "🍕", "🍗", "🍜", "🍚", "🍰", "🍪", "☕", "🧋", "🥤", "🍺", "🥂", "🍽️", "🛒"] },
  { label: "Travel and objects", emojis: ["🚙", "🚌", "🚲", "✈️", "🚢", "⛽", "🗺️", "⌚", "📱", "💻", "🔑", "🔒", "🔔", "📌", "📦", "📝", "✏️", "🔍", "💳", "🧾"] },
  { label: "Symbols", emojis: ["💯", "✔️", "❗", "❓", "‼️", "➕", "➖", "➡️", "⬅️", "⬆️", "⬇️", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤"] },
];
const reactions = ["👍", "👎", "❤️", "😂", "🤣", "😮", "😢", "😭", "😡", "🎉", "🔥", "👏", "🙏", "💯", "✅", "👀", "🤔", "🙌"];

export default function ConversationPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const { startCall, notice: callNotice } = useCall();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "sending" | "error">("loading");
  const [notice, setNotice] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [reactionPicker, setReactionPicker] = useState<{ messageId: string; vertical: "above" | "below"; horizontal: "left" | "right" } | null>(null);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const typingIdle = useRef<number | null>(null);
  const typingActive = useRef(false);
  const peerTypingIdle = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/jobs/${jobId}/conversation`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setConversation(((await response.json()) as { data: Conversation }).data);
      setState("ready");
      window.setTimeout(() => end.current?.scrollIntoView({ block: "end" }), 0);
    } catch {
      setState("error");
    }
  }, [jobId]);
  useRealtimeInvalidation(() => void load(), (event) =>
    !isEphemeralRealtimeEvent(event.type)
    && (event.data.jobId === jobId || event.data.contextId === jobId),
  );

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(initial);
    };
  }, [load]);

  useEffect(() => {
    const onDomainEvent = (event: Event) => {
      const detail = (event as CustomEvent<DomainEvent>).detail;
      if (!detail || detail.type !== "conversation.typing.changed" || detail.data.jobId !== jobId) return;
      if (detail.data.actorUserId === conversation?.viewerUserId) return;
      const active = detail.data.active === true;
      setPeerTyping(active);
      if (peerTypingIdle.current !== null) window.clearTimeout(peerTypingIdle.current);
      if (active) {
        peerTypingIdle.current = window.setTimeout(() => setPeerTyping(false), 4_000);
      }
    };
    window.addEventListener(domainEventName, onDomainEvent);
    return () => {
      window.removeEventListener(domainEventName, onDomainEvent);
      if (peerTypingIdle.current !== null) window.clearTimeout(peerTypingIdle.current);
    };
  }, [conversation?.viewerUserId, jobId]);

  async function publishTyping(active: boolean) {
    if (typingActive.current === active) return;
    typingActive.current = active;
    try {
      await fetch(`/api/v1/jobs/${jobId}/conversation/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
    } catch {
      typingActive.current = !active;
    }
  }

  function onComposerChange(value: string) {
    setText(value);
    void publishTyping(true);
    if (typingIdle.current !== null) window.clearTimeout(typingIdle.current);
    typingIdle.current = window.setTimeout(() => {
      void publishTyping(false);
    }, 1_500);
  }

  useEffect(() => () => {
    if (typingIdle.current !== null) window.clearTimeout(typingIdle.current);
    if (!typingActive.current) return;
    typingActive.current = false;
    void fetch(`/api/v1/jobs/${jobId}/conversation/typing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    }).catch(() => undefined);
  }, [jobId]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() && !file) return;
    setState("sending");
    setNotice("");
    const response = await fetch(`/api/v1/jobs/${jobId}/conversation/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text.trim() || "Attachment", commandId: crypto.randomUUID() }),
    });
    if (!response.ok) {
      setState("error");
      return;
    }
    const messageId = ((await response.json()) as { data: { id: string } }).data.id;
    if (file) {
      const data = new FormData();
      data.append("file", file);
      const upload = await fetch(`/api/v1/messages/${messageId}/assets`, { method: "POST", body: data });
      if (!upload.ok) setNotice("Your message was sent, but the attachment could not be uploaded.");
      setFile(null);
    }
    setText("");
    setState("ready");
    if (typingIdle.current !== null) window.clearTimeout(typingIdle.current);
    void publishTyping(false);
    await load();
  }

  async function react(messageId: string, reaction: string) {
    const response = await fetch(`/api/v1/messages/${messageId}/reaction`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaction }),
    });
    if (response.ok) await load();
  }

  function toggleReactionPicker(messageId: string, button: HTMLButtonElement) {
    if (reactionPicker?.messageId === messageId) { setReactionPicker(null); return; }
    const boundary = button.closest(`.${styles.messages}`)?.getBoundingClientRect();
    const trigger = button.getBoundingClientRect();
    const vertical = boundary && trigger.top - boundary.top < 190 ? "below" : "above";
    const horizontal = boundary && trigger.left - boundary.left > boundary.width / 2 ? "right" : "left";
    setReactionPicker({ messageId, vertical, horizontal });
  }

  async function beginCall(media: "audio" | "video") {
    setNotice("");
    await startCall({
      contextType: "job",
      contextId: jobId,
      media,
      peerName: conversation?.otherParty.name,
      peerAvatarUrl: conversation?.otherParty.avatarUrl,
    });
  }

  const otherName = conversation?.otherParty.name || "Job participant";
  const otherAvatar = conversation?.otherParty.avatarUrl || null;
  const conversationMedia = conversation?.messages.flatMap((message) => message.assets)
    .filter((asset): asset is Asset & { url: string } => asset.url !== null && asset.mimeType.startsWith("image/")) ?? [];
  const selectedMediaIndex = selectedMediaId === null ? -1 : conversationMedia.findIndex((asset) => asset.id === selectedMediaId);
  const timeline = conversation ? [
    ...conversation.messages.map((message) => ({ kind: "message" as const, at: message.createdAt, message })),
    ...conversation.calls.map((callLog) => ({ kind: "call" as const, at: callLog.startedAt, callLog })),
  ].sort((first, second) => new Date(first.at).getTime() - new Date(second.at).getTime()) : [];

  return (
    <main className={styles.chatShell}>
      <section className={styles.chatWindow}>
        <header className={styles.chatHeader}>
          <a href={`/jobs/${jobId}`} aria-label="Back to job"><ArrowLeft /></a>
          <span className={styles.chatAvatar}>
            {conversation?.otherParty.avatarUrl
              ? <img src={conversation.otherParty.avatarUrl} alt={`${otherName} profile`} />
              : otherName.slice(0, 1).toUpperCase()}
            <i aria-label="Conversation available" />
          </span>
          <div>
            <h1>{otherName}</h1>
            <p>Hired job conversation</p>
          </div>
          <nav aria-label="Call controls">
            <button type="button" onClick={() => void beginCall("audio")} aria-label={`Audio call ${otherName}`}><Phone /></button>
            <button type="button" onClick={() => void beginCall("video")} aria-label={`Video call ${otherName}`}><Video /></button>
          </nav>
        </header>

        <div className={styles.chatPrivacy}><ShieldCheck /><span>Private to this job’s client and provider</span></div>
        <p className={styles.chatNotice} role="status">
          {state === "error" ? "Chat is unavailable. Check your connection and try again; your draft remains here." : notice || callNotice}
        </p>

        <section className={styles.messages} aria-live="polite" aria-label="Messages">
          {state === "loading" && <div className={styles.chatLoading}><LoaderCircle />Loading conversation…</div>}
          {state !== "loading" && conversation?.messages.length === 0 && (
            <div className={styles.chatEmpty}><Smile /><h2>Start the conversation</h2><p>Confirm timing, arrival, and anything needed for the job.</p></div>
          )}
          {timeline.map((entry) => {
            if (entry.kind === "call") return <CallLogCard call={entry.callLog} key={`call-${entry.callLog.id}`} />;
            const message = entry.message;
            const mine = message.senderUserId === conversation?.viewerUserId;
            const attachmentOnly = message.body === "Attachment" && message.assets.length > 0;
            return (
              <article className={`${styles.messageRow} ${mine ? styles.mine : ""}`} key={message.id}>
                {!mine && <span className={styles.messageAvatar}>{otherAvatar ? <img src={otherAvatar} alt="" /> : otherName[0]}</span>}
                <div className={styles.messageContent}>
                  <div className={styles.bubble}>
                    {!attachmentOnly && message.body && <p>{message.body}</p>}
                    {message.assets.map((asset) => (
                      asset.url && asset.mimeType.startsWith("image/") ? (
                        <button className={styles.chatImage} key={asset.id} type="button" onClick={() => setSelectedMediaId(asset.id)} aria-label={`View ${asset.name}`}><img src={asset.url} alt={asset.name} /></button>
                      ) : (
                        <div className={styles.attachment} key={asset.id}>
                          {asset.mimeType.startsWith("image/") ? <ImageIcon /> : <FileText />}
                          <span><strong>{asset.name}</strong><small>{asset.scanStatus === "clean" ? "Ready to view" : asset.scanStatus === "pending" ? "Safety check in progress" : "Attachment unavailable"}</small></span>
                        </div>
                      )
                    ))}
                    <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
                  </div>
                  <div className={styles.messageReactions} data-open={reactionPicker?.messageId === message.id}>
                    {Object.entries(message.reactions).filter(([, count]) => count > 0).map(([reaction, count]) => (
                      <button className={message.viewerReactions.includes(reaction) ? styles.reacted : ""} key={reaction} type="button" onClick={() => void react(message.id, reaction)} aria-label={`React ${reaction}`}>
                        {reaction}<span>{count}</span>
                      </button>
                    ))}
                    <button className={styles.reactionToggle} type="button" onClick={(event) => toggleReactionPicker(message.id, event.currentTarget)} aria-label="Choose a reaction" aria-expanded={reactionPicker?.messageId === message.id}><Smile /></button>
                    {reactionPicker?.messageId === message.id && <div className={styles.reactionTray} data-vertical={reactionPicker.vertical} data-horizontal={reactionPicker.horizontal}>{reactions.map((reaction) => (
                      <button className={message.viewerReactions.includes(reaction) ? styles.reacted : ""} key={reaction} type="button" onClick={() => { void react(message.id, reaction); setReactionPicker(null); }} aria-label={`React ${reaction}`}>{reaction}</button>
                    ))}</div>}
                  </div>
                </div>
              </article>
            );
          })}
          {peerTyping && <p className={styles.typingIndicator} aria-live="polite">{otherName} is typing…</p>}
          <div ref={end} />
        </section>

        <form className={styles.composer} onSubmit={(event) => void send(event)}>
          {file && <div className={styles.filePreview}><Paperclip /><span>{file.name}</span><button type="button" onClick={() => setFile(null)} aria-label="Remove attachment"><X /></button></div>}
          {showAttach && (
            <div className={styles.attachTray} aria-label="Add photo or video">
              <AttachmentSourceActions
                compact
                kinds={["image", "video", "pdf"]}
                onFiles={(files) => {
                  setFile(files[0] || null);
                  setShowAttach(false);
                  setShowEmoji(false);
                }}
              />
            </div>
          )}
          {showEmoji && <div className={styles.emojiPicker} aria-label="Choose emoji">{emojiGroups.map((group) => <section key={group.label}><h2>{group.label}</h2><div>{group.emojis.map((emoji) => <button type="button" key={emoji} aria-label={`Add ${emoji}`} onClick={() => setText((current) => current + emoji)}>{emoji}</button>)}</div></section>)}</div>}
          <div className={styles.composerBar}>
            <button
              type="button"
              onClick={() => {
                setShowAttach((shown) => !shown);
                setShowEmoji(false);
              }}
              aria-label="Attach photo, video, or PDF"
              aria-expanded={showAttach}
            >
              <Plus />
            </button>
            <button type="button" onClick={() => { setShowEmoji((shown) => !shown); setShowAttach(false); }} aria-label="Add emoji"><Smile /></button>
            <input value={text} maxLength={12000} onChange={(event) => onComposerChange(event.target.value)} placeholder="Message" aria-label="Message" />
            <button className={styles.sendButton} type="submit" disabled={state === "sending" || (!text.trim() && !file)} aria-label="Send message"><Send /></button>
          </div>
        </form>
        {selectedMediaIndex >= 0 && <MediaViewer assets={conversationMedia as ViewableMedia[]} initialIndex={selectedMediaIndex} onClose={() => setSelectedMediaId(null)} />}
      </section>
    </main>
  );
}

function CallLogCard({ call }: { call: CallLog }) {
  const incoming = call.viewerDirection === "incoming";
  const title = callTitle(call);
  return <article className={styles.callLog}>
    <span>{incoming ? <PhoneIncoming aria-hidden="true" /> : <PhoneOutgoing aria-hidden="true" />}</span>
    <div><strong>{title}</strong><small>{call.media === "video" ? "Video" : "Audio"} · {new Date(call.startedAt).toLocaleString()}</small>{call.durationSeconds !== null && <small>{formatCallDuration(call.durationSeconds)}</small>}</div>
  </article>;
}

function callTitle(call: CallLog): string {
  if (call.status === "active") return call.viewerDirection === "incoming" ? "Incoming call answered" : "Outgoing call answered";
  if (call.status === "declined") return call.viewerDirection === "incoming" ? "Call declined" : "Call was declined";
  if (call.endedReason === "failed") return "Call failed";
  if (call.status === "ringing") return call.viewerDirection === "incoming" ? "Missed call" : "No answer";
  return call.viewerDirection === "incoming" ? "Incoming call" : "Outgoing call";
}

function formatCallDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `Duration ${minutes}:${String(remainder).padStart(2, "0")}`;
}
