import { Capacitor, registerPlugin } from "@capacitor/core";

type CaptureResult = { path: string; name: string; mimeType: string };
const MediaCapture = registerPlugin<{ capture(options: { kind: "photo" | "video" }): Promise<CaptureResult> }>("MediaCapture");

export function nativeMediaCaptureAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function captureNativeMedia(kind: "photo" | "video"): Promise<File | null> {
  if (!nativeMediaCaptureAvailable()) return null;
  const captured = await MediaCapture.capture({ kind });
  const response = await fetch(Capacitor.convertFileSrc(captured.path));
  if (!response.ok) throw new Error("The captured media could not be opened.");
  const blob = await response.blob();
  return new File([blob], captured.name, { type: captured.mimeType, lastModified: Date.now() });
}
