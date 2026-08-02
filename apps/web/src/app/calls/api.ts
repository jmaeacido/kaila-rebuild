import type { CallMedia, CallSignal, StartCallInput } from "./types";

export async function fetchCallConfiguration(): Promise<RTCConfiguration> {
  const response = await fetch("/api/v1/calls/configuration");
  if (!response.ok) throw new Error("Call configuration is unavailable.");
  const body = (await response.json()) as { data: RTCConfiguration };
  return body.data;
}

export async function createCallSession(input: StartCallInput): Promise<{ id: string }> {
  const response = await fetch("/api/v1/calls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contextType: input.contextType,
      contextId: input.contextId,
      media: input.media,
    }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || "Calling is temporarily unavailable. You can continue in chat.");
  }
  return ((await response.json()) as { data: { id: string } }).data;
}

export async function sendCallSignal(
  callId: string,
  payload: Omit<CallSignal, "callId" | "media"> & { media?: CallMedia },
): Promise<void> {
  const response = await fetch(`/api/v1/calls/${callId}/signal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Call signaling failed.");
}

export async function pollCallSignals(): Promise<CallSignal[]> {
  const response = await fetch("/api/v1/calls/signals", { cache: "no-store" });
  if (!response.ok) return [];
  return ((await response.json()) as { data: CallSignal[] }).data;
}

export async function fetchSignalState(callId: string): Promise<{
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
}> {
  const response = await fetch(`/api/v1/calls/${callId}/signal-state`, { cache: "no-store" });
  if (!response.ok) throw new Error("Call offer is unavailable.");
  return ((await response.json()) as { data: { offer: RTCSessionDescriptionInit | null; answer: RTCSessionDescriptionInit | null } }).data;
}

export async function transitionCall(
  callId: string,
  action: "answer" | "decline" | "end",
  reason?: "declined" | "completed" | "busy" | "failed",
): Promise<void> {
  const response = await fetch(`/api/v1/calls/${callId}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, reason }),
  });
  if (!response.ok) throw new Error("Call transition failed.");
}
