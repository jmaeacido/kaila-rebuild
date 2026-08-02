/* eslint-disable @next/next/no-img-element */
"use client";

import { Mic, MicOff, Phone, PhoneOff, Video } from "lucide-react";
import type { RefObject } from "react";
import type { ActiveCall } from "./types";
import styles from "./call-overlay.module.css";

type CallOverlayProps = {
  call: ActiveCall;
  muted: boolean;
  notice: string;
  remoteVideo: RefObject<HTMLVideoElement | null>;
  remoteAudio: RefObject<HTMLAudioElement | null>;
  localVideo: RefObject<HTMLVideoElement | null>;
  onAnswer: () => void;
  onDeclineOrEnd: () => void;
  onToggleMute: () => void;
};

export function CallOverlay({
  call,
  muted,
  notice,
  remoteVideo,
  remoteAudio,
  localVideo,
  onAnswer,
  onDeclineOrEnd,
  onToggleMute,
}: CallOverlayProps) {
  const ringingIncoming = call.direction === "incoming" && call.status === "ringing";
  const statusLabel = call.status === "connecting"
    ? "Connecting…"
    : ringingIncoming
      ? `Incoming ${call.media} call`
      : call.status === "active"
        ? "Call connected"
        : "Calling…";

  return (
    <section className={styles.overlay} aria-label={`${call.media} call`}>
      <div className={styles.media}>
        {call.media === "video" && <video ref={remoteVideo} autoPlay playsInline />}
        {call.media === "audio" && <audio ref={remoteAudio} autoPlay />}
        {call.media === "video" && <video className={styles.localVideo} ref={localVideo} autoPlay muted playsInline />}
        {call.media === "audio" && (
          <span className={styles.avatar}>
            {call.peerAvatarUrl ? <img src={call.peerAvatarUrl} alt="" /> : call.peerName.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <h2>{call.peerName}</h2>
      <p>{statusLabel}</p>
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
      <div className={styles.actions}>
        {ringingIncoming && (
          <button className={`${styles.answer} ${styles.labeled}`} type="button" onClick={onAnswer} aria-label={`Answer ${call.media} call`}>
            {call.media === "video" ? <Video /> : <Phone />}
            <span>{call.media === "video" ? "Answer video" : "Answer audio"}</span>
          </button>
        )}
        {call.status === "active" && (
          <button type="button" onClick={onToggleMute} aria-label={muted ? "Unmute" : "Mute"}>
            {muted ? <MicOff /> : <Mic />}
          </button>
        )}
        <button
          className={`${styles.end} ${ringingIncoming ? styles.labeled : ""}`}
          type="button"
          onClick={onDeclineOrEnd}
          aria-label={ringingIncoming ? `Decline ${call.media} call` : "End call"}
        >
          <PhoneOff />
          {ringingIncoming && <span>Decline</span>}
        </button>
      </div>
    </section>
  );
}
