import { Capacitor, registerPlugin } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { PushNotifications } from "@capacitor/push-notifications";

export type MobileTokens = { accessToken: string; refreshToken: string; accessExpiresAt: string; refreshExpiresAt: string };
type SecureSessionPlugin = { save(options: { value: string }): Promise<void>; load(): Promise<{ value?: string }>; clear(): Promise<void> };
const SecureSession = registerPlugin<SecureSessionPlugin>("SecureSession");
const fallbackKey = "kaila.mobile.session";

export async function saveSession(tokens: MobileTokens): Promise<void> {
  const value = JSON.stringify(tokens);
  if (Capacitor.getPlatform() === "android") await SecureSession.save({ value });
  else await Preferences.set({ key: fallbackKey, value });
}

export async function loadSession(): Promise<MobileTokens | null> {
  const result = Capacitor.getPlatform() === "android" ? await SecureSession.load() : await Preferences.get({ key: fallbackKey });
  if (!result.value) return null;
  try { return JSON.parse(result.value) as MobileTokens; } catch { await clearSession(); return null; }
}

export async function clearSession(): Promise<void> {
  if (Capacitor.getPlatform() === "android") await SecureSession.clear();
  else await Preferences.remove({ key: fallbackKey });
}

export async function switchAccount(apiOrigin: string, tokens: MobileTokens | null, next: MobileTokens): Promise<void> {
  if (tokens) {
    await fetch(`${apiOrigin}/api/v1/auth/mobile/logout`, { method: "POST", headers: { Authorization: `Bearer ${tokens.accessToken}`, Accept: "application/json" } }).catch(() => undefined);
  }
  await clearSession();
  await saveSession(next);
  if (Capacitor.getPlatform() === "android") await PushNotifications.register();
}
