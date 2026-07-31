import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { SecureSession } from "./secure-session-plugin";

const verifierKey = "kaila.mobile.social.verifier";
const maximumAgeMilliseconds = 10 * 60 * 1000;
const nativeFallbackKey = "kaila.mobile.social.auth";
type SocialAuthState = { verifier: string; createdAt: number };
export function validSocialAuthVerifier(
  stored: string,
  now = Date.now(),
): string | null {
  try {
    const state = JSON.parse(stored) as SocialAuthState;
    return typeof state.verifier === "string"
      && /^[A-Za-z0-9_-]{43}$/.test(state.verifier)
      && Number.isFinite(state.createdAt)
      && now >= state.createdAt
      && now - state.createdAt <= maximumAgeMilliseconds
      ? state.verifier
      : null;
  } catch {
    return null;
  }
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export async function beginMobileSocialLogin(url: URL): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64Url(verifierBytes);
  const state: SocialAuthState = { verifier, createdAt: Date.now() };
  if (Capacitor.getPlatform() === "android") {
    const value = JSON.stringify(state);
    try {
      await SecureSession.saveSocialAuth({ value });
    } catch {
      // Installed builds predating secure social storage still need a durable
      // verifier until users receive the next Android release.
      await Preferences.set({ key: nativeFallbackKey, value });
    }
  } else {
    sessionStorage.setItem(verifierKey, JSON.stringify(state));
  }
  url.searchParams.set("mobile", "1");
  url.searchParams.set("codeChallenge", await challengeFor(verifier));
  const finished = await Browser.addListener("browserFinished", () => {
    window.dispatchEvent(new Event("kaila:social-browser-closed"));
    void finished.remove();
  });
  try {
    await Browser.open({ url: url.toString() });
  } catch (error) {
    await finished.remove();
    await clearMobileSocialVerifier();
    throw error;
  }
  return true;
}

export async function closeMobileSocialBrowser(): Promise<void> {
  if (Capacitor.isNativePlatform()) await Browser.close();
}

export async function readMobileSocialVerifier(): Promise<string | null> {
  let stored: string | undefined | null;
  if (Capacitor.getPlatform() === "android") {
    try {
      stored = (await SecureSession.loadSocialAuth()).value;
      if (!stored) {
        stored = (await Preferences.get({ key: nativeFallbackKey })).value;
      }
    } catch {
      stored = (await Preferences.get({ key: nativeFallbackKey })).value;
    }
  } else {
    stored = sessionStorage.getItem(verifierKey);
  }
  if (!stored) return null;
  const verifier = validSocialAuthVerifier(stored);
  if (!verifier) {
    await clearMobileSocialVerifier();
    return null;
  }
  return verifier;
}

export async function clearMobileSocialVerifier(): Promise<void> {
  if (Capacitor.getPlatform() === "android") {
    try {
      await SecureSession.clearSocialAuth();
    } catch {
      // The fallback is removed below.
    }
    await Preferences.remove({ key: nativeFallbackKey });
  } else {
    sessionStorage.removeItem(verifierKey);
  }
}
