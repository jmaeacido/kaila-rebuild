const SOUND_BY_EVENT: Record<string, string> = {
  "opportunity.matched": "/sounds/kaila_job_match.wav",
  "offer.selected": "/sounds/kaila_job_hired.wav",
  "offer.created": "/sounds/kaila_offer.wav",
  "offer.revised": "/sounds/kaila_counter_offer.wav",
  "message.created": "/sounds/kaila_message.wav",
  "direct.message.created": "/sounds/kaila_message.wav",
  "message.reacted": "/sounds/kaila_react.wav",
  "conversation.typing.changed": "/sounds/kaila_typing.wav",
  "call.ringing": "/sounds/kaila_call_ring.wav",
  "travel.started": "/sounds/kaila_travel.wav",
  "travel.arrival.changed": "/sounds/kaila_travel.wav",
  "support.case.created": "/sounds/kaila_support.wav",
  "support.message.created": "/sounds/kaila_support.wav",
  "support.reply": "/sounds/kaila_support.wav",
};

const SOUND_BY_ROUTE: Record<string, string> = {
  message: "/sounds/kaila_message.wav",
  offer: "/sounds/kaila_offer.wav",
  travel: "/sounds/kaila_travel.wav",
  call: "/sounds/kaila_call_ring.wav",
  support: "/sounds/kaila_support.wav",
  dispute: "/sounds/kaila_support.wav",
  job: "/sounds/kaila_job_update.wav",
  completion: "/sounds/kaila_job_update.wav",
  review: "/sounds/kaila_job_update.wav",
};

export const UI_SOUNDS = {
  typing: "/sounds/kaila_typing.wav",
  react: "/sounds/kaila_react.wav",
  messageSent: "/sounds/kaila_message_sent.wav",
  callAnswered: "/sounds/kaila_call_answered.wav",
  callEnded: "/sounds/kaila_call_ended.wav",
  callFailed: "/sounds/kaila_call_failed.wav",
  callRingback: "/sounds/kaila_call_ringback.wav",
} as const;

const UI_SOUND_VOLUME: Record<keyof typeof UI_SOUNDS, number> = {
  typing: 0.28,
  react: 0.4,
  messageSent: 0.35,
  callAnswered: 0.5,
  callEnded: 0.45,
  callFailed: 0.5,
  callRingback: 0.42,
};

let unlocked = false;
let active: HTMLAudioElement | null = null;

export type PlaySoundOptions = {
  /** Play inside Capacitor WebView (default false — native FCM channels own push sounds). */
  allowNative?: boolean;
  volume?: number;
};

export function unlockNotificationSounds(): void {
  if (unlocked || typeof window === "undefined") return;
  unlocked = true;
}

export function soundForNotification(type: string, routeType?: string | null): string | null {
  if (SOUND_BY_EVENT[type]) return SOUND_BY_EVENT[type];
  if (routeType && SOUND_BY_ROUTE[routeType]) return SOUND_BY_ROUTE[routeType];
  if (type.startsWith("message.")) return SOUND_BY_ROUTE.message;
  if (type.startsWith("offer.")) return SOUND_BY_ROUTE.offer;
  if (type.startsWith("travel.")) return SOUND_BY_ROUTE.travel;
  if (type.startsWith("call.")) return SOUND_BY_ROUTE.call;
  if (type.startsWith("support.") || type.startsWith("dispute.")) return SOUND_BY_ROUTE.support;
  if (type === "opportunity.matched") return SOUND_BY_EVENT["opportunity.matched"];
  return SOUND_BY_ROUTE.job;
}

export function playNotificationSound(src: string | null | undefined, options: PlaySoundOptions = {}): void {
  if (!src || typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // Native Android already plays channel sounds for background pushes; keep web/desktop chimes only
  // unless the caller opts in (in-app UI cues like typing / reacts / call feedback).
  const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (!options.allowNative && capacitor?.isNativePlatform?.()) return;
  try {
    if (active) {
      active.pause();
      active = null;
    }
    const audio = new Audio(src);
    audio.volume = options.volume ?? 0.55;
    active = audio;
    void audio.play().catch(() => undefined);
  } catch {
    // Autoplay may be blocked until a user gesture unlocks audio.
  }
}

/** Soft in-app cues (conversation + call lifecycle). Always allowed in Capacitor WebView. */
export function playUiSound(kind: keyof typeof UI_SOUNDS): void {
  playNotificationSound(UI_SOUNDS[kind], {
    allowNative: true,
    volume: UI_SOUND_VOLUME[kind],
  });
}
