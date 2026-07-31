import { Capacitor, registerPlugin } from "@capacitor/core";

const verifierKey = "kaila.mobile.social.verifier";
type NativeBrowserPlugin = {
  open(options: { url: string }): Promise<void>;
  close(): Promise<void>;
};
const NativeBrowser = registerPlugin<NativeBrowserPlugin>("Browser");

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
  sessionStorage.setItem(verifierKey, verifier);
  url.searchParams.set("mobile", "1");
  url.searchParams.set("codeChallenge", await challengeFor(verifier));
  await NativeBrowser.open({ url: url.toString() });
  return true;
}

export async function closeMobileSocialBrowser(): Promise<void> {
  if (Capacitor.isNativePlatform()) await NativeBrowser.close();
}

export function readMobileSocialVerifier(): string | null {
  return sessionStorage.getItem(verifierKey);
}

export function clearMobileSocialVerifier(): void {
  sessionStorage.removeItem(verifierKey);
}
