/* eslint-disable @next/next/no-img-element */
"use client";

import { LoaderCircle, Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";
import type { ActiveCall } from "./types";
import styles from "./call-overlay.module.css";

type CallOverlayProps = {
  call: ActiveCall;
  muted: boolean;
  cameraOff: boolean;
  notice: string;
  remoteVideo: RefObject<HTMLVideoElement | null>;
  remoteAudio: RefObject<HTMLAudioElement | null>;
  localVideo: RefObject<HTMLVideoElement | null>;
  onAnswer: () => void;
  onDeclineOrEnd: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
};

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function statusLabel(call: ActiveCall): string {
  if (call.status === "connecting") return "Connecting…";
  if (call.direction === "incoming" && call.status === "ringing") {
    return `Incoming ${call.media} call`;
  }
  if (call.status === "active") return "Connected";
  return call.direction === "outgoing" ? "Ringing…" : "Calling…";
}

function CallDuration() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <p className={styles.duration} aria-live="off">
      {formatDuration(elapsedSeconds)}
    </p>
  );
}

export function CallOverlay({
  call,
  muted,
  cameraOff,
  notice,
  remoteVideo,
  remoteAudio,
  localVideo,
  onAnswer,
  onDeclineOrEnd,
  onToggleMute,
  onToggleCamera,
}: CallOverlayProps) {
  const ringingIncoming = call.direction === "incoming" && call.status === "ringing";
  const waiting = call.status !== "active";
  const showAvatar = call.media === "audio" || waiting;

  return (
    <section className={styles.overlay} aria-label={`${call.media} call with ${call.peerName}`}>
      <div className={styles.backdrop} aria-hidden="true" />

      <div className={styles.content}>
        <div className={`${styles.media} ${call.media === "video" ? styles.videoStage : styles.audioStage}`}>
          {call.media === "video" && (
            <video
              className={`${styles.remoteVideo} ${waiting ? styles.hiddenVideo : ""}`}
              ref={remoteVideo}
              autoPlay
              playsInline
            />
          )}
          {call.media === "audio" && <audio ref={remoteAudio} autoPlay />}

          {showAvatar && (
            <div className={`${styles.avatarWrap} ${waiting ? styles.avatarPulse : ""}`}>
              <span className={styles.avatar}>
                {call.peerAvatarUrl ? (
                  <img src={call.peerAvatarUrl} alt="" />
                ) : (
                  call.peerName.slice(0, 1).toUpperCase()
                )}
              </span>
            </div>
          )}

          {call.media === "video" && (
            <div className={`${styles.localPreview} ${cameraOff ? styles.localPreviewOff : ""}`}>
              <video
                className={cameraOff ? styles.hiddenVideo : ""}
                ref={localVideo}
                autoPlay
                muted
                playsInline
              />
              {cameraOff && (
                <span className={styles.localPreviewPlaceholder} aria-hidden="true">
                  <VideoOff />
                </span>
              )}
            </div>
          )}
        </div>

        <div className={styles.identity}>
          <p className={styles.mediaBadge}>{call.media === "video" ? "Video call" : "Audio call"}</p>
          <h2>{call.peerName}</h2>
          <p className={styles.status}>
            {call.status === "connecting" && <LoaderCircle className={styles.statusSpinner} aria-hidden="true" />}
            <span>{statusLabel(call)}</span>
          </p>
          {call.status === "active" && <CallDuration key={call.id} />}
        </div>

        {notice ? (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        ) : null}
      </div>

      <div className={styles.controls} role="toolbar" aria-label="Call controls">
        {ringingIncoming ? (
          <>
            <button
              className={`${styles.control} ${styles.answer}`}
              type="button"
              onClick={onAnswer}
              aria-label={`Answer ${call.media} call`}
            >
              {call.media === "video" ? <Video /> : <Phone />}
              <span>{call.media === "video" ? "Video" : "Answer"}</span>
            </button>
            <button
              className={`${styles.control} ${styles.end}`}
              type="button"
              onClick={onDeclineOrEnd}
              aria-label={`Decline ${call.media} call`}
            >
              <PhoneOff />
              <span>Decline</span>
            </button>
          </>
        ) : (
          <>
            {call.status === "active" && (
              <button
                className={`${styles.control} ${styles.toggle} ${muted ? styles.toggleActive : ""}`}
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                aria-pressed={muted}
              >
                {muted ? <MicOff /> : <Mic />}
                <span>{muted ? "Unmute" : "Mute"}</span>
              </button>
            )}
            <button
              className={`${styles.control} ${styles.end} ${call.status === "active" ? styles.endPrimary : ""}`}
              type="button"
              onClick={onDeclineOrEnd}
              aria-label={call.status === "active" ? "End call" : "Cancel call"}
            >
              <PhoneOff />
              <span>{call.status === "active" ? "End" : "Cancel"}</span>
            </button>
            {call.status === "active" && call.media === "video" && (
              <button
                className={`${styles.control} ${styles.toggle} ${cameraOff ? styles.toggleActive : ""}`}
                type="button"
                onClick={onToggleCamera}
                aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
                aria-pressed={cameraOff}
              >
                {cameraOff ? <VideoOff /> : <Video />}
                <span>{cameraOff ? "Camera on" : "Camera off"}</span>
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
