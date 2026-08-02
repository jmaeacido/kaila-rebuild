import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { PushNotifications } from "@capacitor/push-notifications";
import { SecureSession } from "./secure-session-plugin";

export type MobileTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  sessionId?: string;
};

const fallbackKey = "kaila.mobile.session";
const skewMs = 60_000;

export async function saveSession(tokens: MobileTokens): Promise<void> {
  const value = JSON.stringify(tokens);
  if (Capacitor.getPlatform() === "android") await SecureSession.save({ value });
  else await Preferences.set({ key: fallbackKey, value });
}

export async function loadSession(): Promise<MobileTokens | null> {
  const result = Capacitor.getPlatform() === "android" ? await SecureSession.load() : await Preferences.get({ key: fallbackKey });
  if (!result.value) return null;
  try {
    return JSON.parse(result.value) as MobileTokens;
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession(): Promise<void> {
  if (Capacitor.getPlatform() === "android") await SecureSession.clear();
  else await Preferences.remove({ key: fallbackKey });
}

export async function switchAccount(apiOrigin: string, tokens: MobileTokens | null, next: MobileTokens): Promise<void> {
  if (tokens) {
    await fetch(`${apiOrigin}/api/v1/auth/mobile/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokens.accessToken}`, Accept: "application/json" },
    }).catch(() => undefined);
  }
  await clearSession();
  await saveSession(next);
  if (Capacitor.getPlatform() === "android") await PushNotifications.register();
}

function stillFresh(tokens: MobileTokens, now = Date.now()): boolean {
  const expires = Date.parse(tokens.accessExpiresAt);
  return Number.isFinite(expires) && expires - skewMs > now;
}

async function refreshMobileTokens(apiOrigin: string, refreshToken: string): Promise<MobileTokens | null> {
  const response = await fetch(`${apiOrigin}/api/v1/auth/mobile/refresh`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { data?: { tokens?: MobileTokens } };
  return body.data?.tokens ?? null;
}

async function bridgeMobileTokens(apiOrigin: string, deviceName: string): Promise<MobileTokens | null> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
    if (match?.[1]) headers["X-XSRF-TOKEN"] = decodeURIComponent(match[1]);
  }
  const response = await fetch(`${apiOrigin}/api/v1/auth/mobile/bridge`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ deviceName }),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { data?: { tokens?: MobileTokens } };
  return body.data?.tokens ?? null;
}

/**
 * Ensures Capacitor has a usable bearer session for native plugins (push, background nav).
 * Prefer refresh, otherwise mint from the authenticated cookie session via /auth/mobile/bridge.
 */
export async function ensureMobileSession(
  apiOrigin: string,
  deviceName = "KAILA Android",
): Promise<MobileTokens> {
  const existing = await loadSession();
  if (existing && stillFresh(existing)) return existing;

  if (existing?.refreshToken) {
    const rotated = await refreshMobileTokens(apiOrigin, existing.refreshToken).catch(() => null);
    if (rotated) {
      await saveSession(rotated);
      return rotated;
    }
  }

  const bridged = await bridgeMobileTokens(apiOrigin, deviceName);
  if (!bridged) {
    throw new Error("Your mobile session needs to be refreshed before background features can start.");
  }
  await saveSession(bridged);
  return bridged;
}
