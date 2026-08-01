/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, use, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Mic,
  MicOff,
  Paperclip,
  Phone,
  PhoneOff,
  Plus,
  Send,
  ShieldCheck,
  Smile,
  Video,
  X,
} from "lucide-react";
import styles from "../hired.module.css";
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
};
type CallSignal = {
  type: "ringing" | "offer" | "answer" | "candidate" | "hangup";
  callId: string;
  media: "audio" | "video";
  description?: RTCSessionDescriptionInit | null;
  candidate?: RTCIceCandidateInit | null;
};
type ActiveCall = { id: string; media: "audio" | "video"; direction: "incoming" | "outgoing"; status: "ringing" | "connecting" | "active" };

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
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "sending" | "error">("loading");
  const [notice, setNotice] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [muted, setMuted] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const peerCallId = useRef<string | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const answering = useRef(false);
  const queuedOffers = useRef(new Map<string, RTCSessionDescriptionInit>());
  const queuedCandidates = useRef(new Map<string, RTCIceCandidateInit[]>());
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const localVideo = useRef<HTMLVideoElement>(null);

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
  useRealtimeInvalidation(() => void load(), (event) => event.data.jobId === jobId);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(initial);
    };
  }, [load]);

  const sendSignal = useCallback(async (callId: string, payload: Omit<CallSignal, "callId" | "media">) => {
    const response = await fetch(`/api/v1/calls/${callId}/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Call signaling failed.");
  }, []);

  const createPeer = useCallback(async (callId: string, media: "audio" | "video") => {
    const configuration = await fetch("/api/v1/calls/configuration");
    if (!configuration.ok) throw new Error("Call configuration is unavailable.");
    const config = (await configuration.json()) as { data: RTCConfiguration };
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: media === "video" });
    localStream.current = stream;
    const connection = new RTCPeerConnection(config.data);
    stream.getTracks().forEach((track) => connection.addTrack(track, stream));
    connection.ontrack = (event) => {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      if (media === "video" && remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
      if (media === "audio" && remoteAudio.current) {
        remoteAudio.current.srcObject = remoteStream;
        void remoteAudio.current.play().catch(() => {
          setNotice("Tap the call screen once to enable call audio.");
        });
      }
    };
    connection.onicecandidate = (event) => {
      if (event.candidate) void sendSignal(callId, { type: "candidate", candidate: event.candidate.toJSON() });
    };
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === "connected") {
        setCall((current) => current?.id === callId ? { ...current, status: "active" } : current);
        setNotice("");
      } else if (connection.connectionState === "failed") {
        setNotice("The call connection failed. End the call and try again on a stable network.");
      }
    };
    peer.current = connection;
    peerCallId.current = callId;
    window.setTimeout(() => {
      if (localVideo.current) localVideo.current.srcObject = stream;
    }, 0);
    return connection;
  }, [sendSignal]);

  const closeCall = useCallback(() => {
    peer.current?.close();
    peer.current = null;
    peerCallId.current = null;
    localStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null;
    setCall(null);
    setMuted(false);
  }, []);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const response = await fetch("/api/v1/calls/signals", { cache: "no-store" });
        if (!response.ok || !active) return;
        const signals = ((await response.json()) as { data: CallSignal[] }).data;
        for (const signal of signals) {
          if (signal.type === "ringing") {
            setCall((current) => current || { id: signal.callId, media: signal.media, direction: "incoming", status: "ringing" });
          } else if (signal.type === "offer" && signal.description) {
            queuedOffers.current.set(signal.callId, signal.description);
          } else if (signal.type === "answer" && signal.description && peer.current && peerCallId.current === signal.callId) {
            await peer.current.setRemoteDescription(signal.description);
            for (const candidate of queuedCandidates.current.get(signal.callId) || []) {
              try {
                await peer.current.addIceCandidate(candidate);
              } catch {
                // A stale network candidate must not prevent SDP negotiation.
              }
            }
            queuedCandidates.current.delete(signal.callId);
            setCall((current) => current ? { ...current, status: "connecting" } : current);
          } else if (signal.type === "candidate" && signal.candidate) {
            if (peer.current?.remoteDescription && peerCallId.current === signal.callId) {
              try {
                await peer.current.addIceCandidate(signal.candidate);
              } catch {
                // Browsers can reject obsolete candidates after a network change.
              }
            } else {
              const candidates = queuedCandidates.current.get(signal.callId) || [];
              candidates.push(signal.candidate);
              queuedCandidates.current.set(signal.callId, candidates);
            }
          } else if (signal.type === "hangup") {
            setCall((current) => {
              if (current?.id !== signal.callId) return current;
              window.setTimeout(closeCall, 0);
              return current;
            });
          }
        }
      } catch {
        // The next poll reconciles transient signaling failures.
      }
    };
    const initial = window.setTimeout(() => void poll(), 0);
    const timer = window.setInterval(() => void poll(), 750);
    return () => {
      active = false;
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [closeCall]);

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
      else setNotice("Attachment uploaded and queued for a safety check.");
    }
    setText("");
    setFile(null);
    setShowEmoji(false);
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

  async function startCall(media: "audio" | "video") {
    setNotice("");
    const response = await fetch("/api/v1/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contextType: "job", contextId: jobId, media }),
    });
    if (response.ok) {
      const created = (await response.json()) as { data: { id: string } };
      try {
        setCall({ id: created.data.id, media, direction: "outgoing", status: "ringing" });
        const connection = await createPeer(created.data.id, media);
        await connection.setLocalDescription();
        if (!connection.localDescription) throw new Error("The browser did not create a call offer.");
        await sendSignal(created.data.id, { type: "offer", description: connection.localDescription.toJSON() });
      } catch {
        closeCall();
        setNotice("Microphone or camera access is required to start the call.");
      }
      return;
    }
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    setNotice(body?.error?.message || "Calling is temporarily unavailable. You can continue in chat.");
  }

  async function answerCall() {
    if (!call || answering.current) return;
    answering.current = true;
    setCall({ ...call, status: "connecting" });
    let stage = "loading the call offer";
    try {
      let offer = queuedOffers.current.get(call.id) || null;
      if (!offer) {
        const response = await fetch(`/api/v1/calls/${call.id}/signal-state`, { cache: "no-store" });
        if (!response.ok) throw new Error();
        offer = ((await response.json()) as { data: { offer: RTCSessionDescriptionInit | null } }).data.offer;
      }
      if (!offer) {
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        const response = await fetch(`/api/v1/calls/${call.id}/signal-state`, { cache: "no-store" });
        if (!response.ok) throw new Error();
        offer = ((await response.json()) as { data: { offer: RTCSessionDescriptionInit | null } }).data.offer;
      }
      if (!offer) throw new Error();
      stage = "opening your camera and microphone";
      const connection = await createPeer(call.id, call.media);
      stage = "applying the caller’s offer";
      await connection.setRemoteDescription(offer);
      for (const candidate of queuedCandidates.current.get(call.id) || []) {
        try {
          await connection.addIceCandidate(candidate);
        } catch {
          // Continue negotiating when a queued candidate is no longer usable.
        }
      }
      queuedCandidates.current.delete(call.id);
      queuedOffers.current.delete(call.id);
      stage = "creating the call answer";
      await connection.setLocalDescription();
      if (!connection.localDescription) throw new Error("The browser did not create a call answer.");
      stage = "sending the call answer";
      await sendSignal(call.id, { type: "answer", description: connection.localDescription.toJSON() });
      stage = "confirming the answered call";
      const transition = await fetch(`/api/v1/calls/${call.id}/transition`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "answer" }) });
      if (!transition.ok) throw new Error();
      setCall({ ...call, status: "connecting" });
    } catch (error) {
      peer.current?.close();
      peer.current = null;
      peerCallId.current = null;
      localStream.current?.getTracks().forEach((track) => track.stop());
      localStream.current = null;
      setCall({ ...call, status: "ringing" });
      if (error instanceof DOMException && ["NotAllowedError", "SecurityError"].includes(error.name)) {
        setNotice(`Allow ${call.media === "video" ? "camera and microphone" : "microphone"} access in your browser, then answer again.`);
      } else if (error instanceof DOMException && error.name === "NotFoundError") {
        setNotice(`No ${call.media === "video" ? "camera or microphone" : "microphone"} was found on this device.`);
      } else {
        console.error(`Call failed while ${stage}.`, error);
        setNotice(`The call failed while ${stage}. Please try a new call.`);
      }
    } finally {
      answering.current = false;
    }
  }

  async function endCall(action: "decline" | "end" = "end") {
    if (!call) return;
    await sendSignal(call.id, { type: "hangup" });
    await fetch(`/api/v1/calls/${call.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: action === "decline" ? "declined" : "completed" }),
    });
    closeCall();
  }

  function toggleMute() {
    const next = !muted;
    localStream.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  }

  const otherName = conversation?.otherParty.name || "Job participant";
  const conversationMedia = conversation?.messages.flatMap((message) => message.assets)
    .filter((asset): asset is Asset & { url: string } => asset.url !== null && asset.mimeType.startsWith("image/")) ?? [];
  const selectedMediaIndex = selectedMediaId === null ? -1 : conversationMedia.findIndex((asset) => asset.id === selectedMediaId);
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
            <button type="button" onClick={() => void startCall("audio")} aria-label={`Audio call ${otherName}`}><Phone /></button>
            <button type="button" onClick={() => void startCall("video")} aria-label={`Video call ${otherName}`}><Video /></button>
          </nav>
        </header>

        <div className={styles.chatPrivacy}><ShieldCheck /><span>Private to this job’s client and provider</span></div>
        <p className={styles.chatNotice} role="status">
          {state === "error" ? "Chat is unavailable. Check your connection and try again; your draft remains here." : notice}
        </p>

        <section className={styles.messages} aria-live="polite" aria-label="Messages">
          {state === "loading" && <div className={styles.chatLoading}><LoaderCircle />Loading conversation…</div>}
          {state !== "loading" && conversation?.messages.length === 0 && (
            <div className={styles.chatEmpty}><Smile /><h2>Start the conversation</h2><p>Confirm timing, arrival, and anything needed for the job.</p></div>
          )}
          {conversation?.messages.map((message) => {
            const mine = message.senderUserId === conversation.viewerUserId;
            const attachmentOnly = message.body === "Attachment" && message.assets.length > 0;
            return (
              <article className={`${styles.messageRow} ${mine ? styles.mine : ""}`} key={message.id}>
                {!mine && <span className={styles.messageAvatar}>{conversation.otherParty.avatarUrl ? <img src={conversation.otherParty.avatarUrl} alt="" /> : otherName[0]}</span>}
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
                  <div className={styles.messageReactions} data-open={reactionMessageId === message.id}>
                    {Object.entries(message.reactions).filter(([, count]) => count > 0).map(([reaction, count]) => (
                      <button className={message.viewerReactions.includes(reaction) ? styles.reacted : ""} key={reaction} type="button" onClick={() => void react(message.id, reaction)} aria-label={`React ${reaction}`}>
                        {reaction}<span>{count}</span>
                      </button>
                    ))}
                    <button className={styles.reactionToggle} type="button" onClick={() => setReactionMessageId((current) => current === message.id ? null : message.id)} aria-label="Choose a reaction" aria-expanded={reactionMessageId === message.id}><Smile /></button>
                    {reactionMessageId === message.id && <div className={styles.reactionTray}>{reactions.map((reaction) => (
                      <button className={message.viewerReactions.includes(reaction) ? styles.reacted : ""} key={reaction} type="button" onClick={() => { void react(message.id, reaction); setReactionMessageId(null); }} aria-label={`React ${reaction}`}>{reaction}</button>
                    ))}</div>}
                  </div>
                </div>
              </article>
            );
          })}
          <div ref={end} />
        </section>

        <form className={styles.composer} onSubmit={(event) => void send(event)}>
          {file && <div className={styles.filePreview}><Paperclip /><span>{file.name}</span><button type="button" onClick={() => setFile(null)} aria-label="Remove attachment"><X /></button></div>}
          {showEmoji && <div className={styles.emojiPicker} aria-label="Choose emoji">{emojiGroups.map((group) => <section key={group.label}><h2>{group.label}</h2><div>{group.emojis.map((emoji) => <button type="button" key={emoji} aria-label={`Add ${emoji}`} onClick={() => setText((current) => current + emoji)}>{emoji}</button>)}</div></section>)}</div>}
          <div className={styles.composerBar}>
            <button type="button" onClick={() => fileInput.current?.click()} aria-label="Attach image or PDF"><Plus /></button>
            <input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            <button type="button" onClick={() => setShowEmoji((shown) => !shown)} aria-label="Add emoji"><Smile /></button>
            <input value={text} maxLength={12000} onChange={(event) => setText(event.target.value)} placeholder="Message" aria-label="Message" />
            <button className={styles.sendButton} type="submit" disabled={state === "sending" || (!text.trim() && !file)} aria-label="Send message"><Send /></button>
          </div>
        </form>
        {call && (
          <section className={styles.callOverlay} aria-label={`${call.media} call`}>
            <div className={styles.callMedia}>
              {call.media === "video" && <video ref={remoteVideo} autoPlay playsInline />}
              {call.media === "audio" && <audio ref={remoteAudio} autoPlay />}
              {call.media === "video" && <video className={styles.localVideo} ref={localVideo} autoPlay muted playsInline />}
              {call.media === "audio" && <span className={styles.callAvatar}>{conversation?.otherParty.avatarUrl ? <img src={conversation.otherParty.avatarUrl} alt="" /> : otherName[0]}</span>}
            </div>
            <h2>{otherName}</h2>
            <p>{call.status === "connecting" ? "Connecting…" : call.direction === "incoming" && call.status === "ringing" ? `Incoming ${call.media} call` : call.status === "active" ? "Call connected" : "Calling…"}</p>
            <div className={styles.callActions}>
              {call.direction === "incoming" && call.status === "ringing" && (
                <button className={`${styles.answerCall} ${styles.labeledCallAction}`} type="button" onClick={() => void answerCall()} aria-label={`Answer ${call.media} call`}>
                  {call.media === "video" ? <Video /> : <Phone />}
                  <span>{call.media === "video" ? "Answer video" : "Answer audio"}</span>
                </button>
              )}
              {call.status === "active" && <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>{muted ? <MicOff /> : <Mic />}</button>}
              <button className={`${styles.endCall} ${call.direction === "incoming" && call.status === "ringing" ? styles.labeledCallAction : ""}`} type="button" onClick={() => void endCall(call.direction === "incoming" && call.status === "ringing" ? "decline" : "end")} aria-label={call.direction === "incoming" && call.status === "ringing" ? `Decline ${call.media} call` : "End call"}>
                <PhoneOff />
                {call.direction === "incoming" && call.status === "ringing" && <span>Decline</span>}
              </button>
            </div>
          </section>
        )}
        {selectedMediaIndex >= 0 && <MediaViewer assets={conversationMedia as ViewableMedia[]} initialIndex={selectedMediaIndex} onClose={() => setSelectedMediaId(null)} />}
      </section>
    </main>
  );
}
