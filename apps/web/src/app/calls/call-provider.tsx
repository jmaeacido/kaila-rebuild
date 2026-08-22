"use client";

import { IncomingCall as IncomingCallNative } from "@kaila/mobile/incoming-call";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { playUiSound, UI_SOUNDS } from "../notification-sounds";
import { domainEventName, realtimeAuthChangedName, type DomainEvent } from "../realtime-provider";
import {
  createCallSession,
  fetchCallConfiguration,
  fetchSignalState,
  pollCallSignals,
  sendCallSignal,
  transitionCall,
} from "./api";
import { CallOverlay } from "./call-overlay";
import type { ActiveCall, CallMedia, CallSignal, StartCallInput } from "./types";

function isNativeAndroid(): boolean {
  const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return capacitor?.isNativePlatform?.() === true;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type CallContextValue = {
  call: ActiveCall | null;
  muted: boolean;
  notice: string;
  startCall: (input: StartCallInput) => Promise<void>;
  answerCall: () => Promise<void>;
  endCall: (action?: "decline" | "end") => Promise<void>;
  toggleMute: () => void;
};

const CallContext = createContext<CallContextValue | null>(null);

export function useCall(): CallContextValue {
  const value = useContext(CallContext);
  if (!value) throw new Error("useCall must be used within CallProvider.");
  return value;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [muted, setMuted] = useState(false);
  const [notice, setNotice] = useState("");
  const peer = useRef<RTCPeerConnection | null>(null);
  const peerCallId = useRef<string | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const answering = useRef(false);
  const queuedOffers = useRef(new Map<string, RTCSessionDescriptionInit>());
  const queuedCandidates = useRef(new Map<string, RTCIceCandidateInit[]>());
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const callRef = useRef<ActiveCall | null>(null);
  const ringtone = useRef<HTMLAudioElement | null>(null);
  const ringback = useRef<HTMLAudioElement | null>(null);
  const hadConnected = useRef(false);
  const endCue = useRef<"none" | "ended" | "failed">("none");

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  const stopLoop = useCallback((ref: { current: HTMLAudioElement | null }) => {
    if (!ref.current) return;
    ref.current.pause();
    ref.current.currentTime = 0;
    ref.current = null;
  }, []);

  const stopRingtone = useCallback(() => stopLoop(ringtone), [stopLoop]);
  const stopRingback = useCallback(() => stopLoop(ringback), [stopLoop]);

  const startRingtone = useCallback(() => {
    // Native Android IncomingCallActivity owns the incoming ringtone.
    if (isNativeAndroid() || prefersReducedMotion()) return;
    stopRingtone();
    stopRingback();
    const audio = new Audio("/sounds/kaila_call_ring.wav");
    audio.loop = true;
    audio.volume = 0.7;
    ringtone.current = audio;
    void audio.play().catch(() => undefined);
  }, [stopRingback, stopRingtone]);

  const startRingback = useCallback(() => {
    // Outgoing wait tone plays in WebView on both web and Capacitor.
    if (prefersReducedMotion()) return;
    stopRingtone();
    stopRingback();
    const audio = new Audio(UI_SOUNDS.callRingback);
    audio.loop = true;
    audio.volume = 0.42;
    ringback.current = audio;
    void audio.play().catch(() => undefined);
  }, [stopRingback, stopRingtone]);

  const closeMedia = useCallback((cue: "none" | "ended" | "failed" = endCue.current) => {
    stopRingtone();
    stopRingback();
    peer.current?.close();
    peer.current = null;
    peerCallId.current = null;
    localStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null;
    callRef.current = null;
    setCall(null);
    setMuted(false);
    hadConnected.current = false;
    if (cue === "ended") playUiSound("callEnded");
    if (cue === "failed") playUiSound("callFailed");
    endCue.current = "none";
    if (isNativeAndroid()) {
      void IncomingCallNative.stopActiveCall().catch(() => undefined);
      void IncomingCallNative.cancelIncoming().catch(() => undefined);
    }
  }, [stopRingback, stopRingtone]);

  const sendSignal = useCallback(async (callId: string, payload: Omit<CallSignal, "callId" | "media">) => {
    await sendCallSignal(callId, payload);
  }, []);

  const createPeer = useCallback(async (callId: string, media: CallMedia) => {
    const configuration = await fetchCallConfiguration();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: media === "video" });
    localStream.current = stream;
    const connection = new RTCPeerConnection(configuration);
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
        stopRingtone();
        stopRingback();
        if (!hadConnected.current) {
          hadConnected.current = true;
          playUiSound("callAnswered");
        }
        setCall((current) => (current?.id === callId ? { ...current, status: "active" } : current));
        setNotice("");
        if (isNativeAndroid()) {
          void IncomingCallNative.startActiveCall({ media }).catch(() => undefined);
        }
      } else if (connection.connectionState === "failed") {
        endCue.current = "none";
        setNotice("The call connection failed. End the call and try again on a stable network.");
        playUiSound("callFailed");
      }
    };
    peer.current = connection;
    peerCallId.current = callId;
    window.setTimeout(() => {
      if (localVideo.current) localVideo.current.srcObject = stream;
    }, 0);
    return connection;
  }, [sendSignal, stopRingback, stopRingtone]);

  const applyIncomingRing = useCallback((signal: {
    callId: string;
    media: CallMedia;
    callerName?: string;
    callerAvatarUrl?: string;
    contextType?: string;
    contextId?: string;
  }) => {
    if (callRef.current) return;
    const incoming: ActiveCall = {
      id: signal.callId,
      media: signal.media,
      direction: "incoming",
      status: "ringing",
      contextType: signal.contextType || "job",
      contextId: signal.contextId || "",
      peerName: signal.callerName || "Incoming call",
      peerAvatarUrl: signal.callerAvatarUrl || null,
    };
    endCue.current = "ended";
    callRef.current = incoming;
    startRingtone();
    setCall(incoming);
  }, [startRingtone]);

  useEffect(() => {
    let active = true;
    let pollTimer: number | null = null;
    const pollAbort = new AbortController();
    const poll = async () => {
      try {
        const signals = await pollCallSignals(pollAbort.signal);
        if (!active) return;
        for (const signal of signals) {
          if (signal.type === "ringing") {
            applyIncomingRing(signal);
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
            setCall((current) => (current ? { ...current, status: "connecting" } : current));
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
              if (endCue.current === "none") endCue.current = "ended";
              window.setTimeout(() => closeMedia(), 0);
              return current;
            });
          }
        }
      } catch {
        // The next poll reconciles transient signaling failures.
      } finally {
        if (active) {
          pollTimer = window.setTimeout(() => void poll(), 750);
        }
      }
    };
    pollTimer = window.setTimeout(() => void poll(), 0);
    return () => {
      active = false;
      pollAbort.abort();
      if (pollTimer !== null) window.clearTimeout(pollTimer);
    };
  }, [applyIncomingRing, closeMedia]);

  useEffect(() => {
    const onDomain = (event: Event) => {
      const detail = (event as CustomEvent<DomainEvent>).detail;
      if (detail.type === "call.ringing") {
        const media = detail.data.media === "video" ? "video" : "audio";
        applyIncomingRing({
          callId: String(detail.data.callId || detail.resourceId),
          media,
          callerName: typeof detail.data.callerName === "string" ? detail.data.callerName : undefined,
          callerAvatarUrl: typeof detail.data.callerAvatarUrl === "string" ? detail.data.callerAvatarUrl : undefined,
          contextType: typeof detail.data.contextType === "string" ? detail.data.contextType : undefined,
          contextId: typeof detail.data.contextId === "string" ? detail.data.contextId : undefined,
        });
      } else if (detail.type === "call.status.changed") {
        const callId = String(detail.data.callId || detail.resourceId);
        const status = String(detail.data.status || "");
        if (["declined", "ended"].includes(status)) {
          setCall((current) => {
            if (current?.id !== callId) return current;
            endCue.current = "ended";
            window.setTimeout(() => closeMedia(), 0);
            return current;
          });
        }
      }
    };
    const onAuthChanged = () => {
      endCue.current = "none";
      closeMedia("none");
      setNotice("");
    };
    window.addEventListener(domainEventName, onDomain);
    window.addEventListener(realtimeAuthChangedName, onAuthChanged);
    return () => {
      window.removeEventListener(domainEventName, onDomain);
      window.removeEventListener(realtimeAuthChangedName, onAuthChanged);
    };
  }, [applyIncomingRing, closeMedia]);

  const startCall = useCallback(async (input: StartCallInput) => {
    setNotice("");
    endCue.current = "ended";
    hadConnected.current = false;
    try {
      const created = await createCallSession(input);
      setCall({
        id: created.id,
        media: input.media,
        direction: "outgoing",
        status: "ringing",
        contextType: input.contextType,
        contextId: input.contextId,
        peerName: input.peerName || "Calling…",
        peerAvatarUrl: input.peerAvatarUrl ?? null,
      });
      startRingback();
      const connection = await createPeer(created.id, input.media);
      await connection.setLocalDescription();
      if (!connection.localDescription) throw new Error("The browser did not create a call offer.");
      await sendSignal(created.id, { type: "offer", description: connection.localDescription.toJSON() });
    } catch (error) {
      const currentId = callRef.current?.id;
      if (currentId) {
        await transitionCall(currentId, "end", "failed").catch(() => undefined);
      }
      closeMedia("failed");
      setNotice(error instanceof Error ? error.message : "Microphone or camera access is required to start the call.");
    }
  }, [closeMedia, createPeer, sendSignal, startRingback]);

  const answerCall = useCallback(async () => {
    const current = callRef.current;
    if (!current || answering.current) return;
    answering.current = true;
    setCall({ ...current, status: "connecting" });
    let stage = "loading the call offer";
    try {
      let offer = queuedOffers.current.get(current.id) || null;
      if (!offer) {
        offer = (await fetchSignalState(current.id)).offer;
      }
      if (!offer) {
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        offer = (await fetchSignalState(current.id)).offer;
      }
      if (!offer) throw new Error();
      stage = "opening your camera and microphone";
      const connection = await createPeer(current.id, current.media);
      stage = "applying the caller’s offer";
      await connection.setRemoteDescription(offer);
      for (const candidate of queuedCandidates.current.get(current.id) || []) {
        try {
          await connection.addIceCandidate(candidate);
        } catch {
          // Continue negotiating when a queued candidate is no longer usable.
        }
      }
      queuedCandidates.current.delete(current.id);
      queuedOffers.current.delete(current.id);
      stage = "creating the call answer";
      await connection.setLocalDescription();
      if (!connection.localDescription) throw new Error("The browser did not create a call answer.");
      stage = "sending the call answer";
      await sendSignal(current.id, { type: "answer", description: connection.localDescription.toJSON() });
      stage = "confirming the answered call";
      await transitionCall(current.id, "answer");
      stopRingtone();
      setCall({ ...current, status: "connecting" });
      if (isNativeAndroid()) {
        void IncomingCallNative.cancelIncoming().catch(() => undefined);
      }
    } catch (error) {
      peer.current?.close();
      peer.current = null;
      peerCallId.current = null;
      localStream.current?.getTracks().forEach((track) => track.stop());
      localStream.current = null;
      setCall({ ...current, status: "ringing" });
      playUiSound("callFailed");
      if (error instanceof DOMException && ["NotAllowedError", "SecurityError"].includes(error.name)) {
        setNotice(`Allow ${current.media === "video" ? "camera and microphone" : "microphone"} access in your browser, then answer again.`);
      } else if (error instanceof DOMException && error.name === "NotFoundError") {
        setNotice(`No ${current.media === "video" ? "camera or microphone" : "microphone"} was found on this device.`);
      } else {
        console.error(`Call failed while ${stage}.`, error);
        setNotice(`The call failed while ${stage}. Please try a new call.`);
      }
    } finally {
      answering.current = false;
    }
  }, [createPeer, sendSignal, stopRingtone]);

  const endCall = useCallback(async (action: "decline" | "end" = "end") => {
    const current = callRef.current;
    if (!current) return;
    endCue.current = "ended";
    await sendSignal(current.id, { type: "hangup" }).catch(() => undefined);
    await transitionCall(current.id, action, action === "decline" ? "declined" : "completed").catch(() => undefined);
    closeMedia("ended");
  }, [closeMedia, sendSignal]);

  useEffect(() => {
    const onNativeAction = (event: Event) => {
      const detail = (event as CustomEvent<{ callId?: string; action?: string; media?: CallMedia; contextType?: string; contextId?: string; callerName?: string; callerAvatarUrl?: string }>).detail;
      if (!detail?.callId || !detail.action) return;
      if (detail.action === "ring" || detail.action === "open") {
        applyIncomingRing({
          callId: detail.callId,
          media: detail.media === "video" ? "video" : "audio",
          callerName: detail.callerName,
          callerAvatarUrl: detail.callerAvatarUrl,
          contextType: detail.contextType,
          contextId: detail.contextId,
        });
      }
      if (detail.action === "answer") {
        applyIncomingRing({
          callId: detail.callId,
          media: detail.media === "video" ? "video" : "audio",
          callerName: detail.callerName,
          callerAvatarUrl: detail.callerAvatarUrl,
          contextType: detail.contextType,
          contextId: detail.contextId,
        });
        window.setTimeout(() => {
          void answerCall();
        }, 50);
      }
      if (detail.action === "decline") {
        applyIncomingRing({
          callId: detail.callId,
          media: detail.media === "video" ? "video" : "audio",
          callerName: detail.callerName,
          callerAvatarUrl: detail.callerAvatarUrl,
          contextType: detail.contextType,
          contextId: detail.contextId,
        });
        window.setTimeout(() => {
          void endCall("decline");
        }, 50);
      }
      if (detail.action === "cancel") {
        setCall((current) => {
          if (current && current.id !== detail.callId) return current;
          endCue.current = "ended";
          window.setTimeout(() => closeMedia(), 0);
          return current;
        });
      }
    };
    window.addEventListener("kaila:native-call", onNativeAction);
    return () => window.removeEventListener("kaila:native-call", onNativeAction);
  }, [answerCall, applyIncomingRing, closeMedia, endCall]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    localStream.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [muted]);

  // Hydrate from deep-link query once on mount (native answer / open).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callId = params.get("callId");
    const action = params.get("callAction");
    if (!callId || !action) return;
    const media = params.get("callMedia") === "video" ? "video" : "audio";
    window.dispatchEvent(new CustomEvent("kaila:native-call", {
      detail: {
        callId,
        action,
        media,
        contextType: params.get("callContextType") || "job",
        contextId: params.get("callContextId") || "",
        callerName: params.get("callCallerName") || undefined,
        callerAvatarUrl: params.get("callCallerAvatarUrl") || undefined,
      },
    }));
  }, []);

  const value = useMemo(
    () => ({ call, muted, notice, startCall, answerCall, endCall, toggleMute }),
    [answerCall, call, endCall, muted, notice, startCall, toggleMute],
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      {call && (
        <CallOverlay
          call={call}
          muted={muted}
          notice={notice}
          remoteVideo={remoteVideo}
          remoteAudio={remoteAudio}
          localVideo={localVideo}
          onAnswer={() => void answerCall()}
          onDeclineOrEnd={() => void endCall(call.direction === "incoming" && call.status === "ringing" ? "decline" : "end")}
          onToggleMute={toggleMute}
        />
      )}
    </CallContext.Provider>
  );
}
