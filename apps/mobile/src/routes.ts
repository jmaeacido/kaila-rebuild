const allowedTypes = new Set(["job", "offer", "message", "call", "travel", "completion", "dispute", "review", "security", "support"]);

function safeId(value: string | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9-]+$/.test(value));
}

function callDeepLink(data: {
  callId?: string;
  contextId?: string;
  media?: string;
  callerName?: string;
  action?: string;
}): string | null {
  if (!safeId(data.callId) || !safeId(data.contextId)) return null;
  const params = new URLSearchParams({
    callId: data.callId,
    callAction: data.action || "open",
    callMedia: data.media === "video" ? "video" : "audio",
    callContextType: "job",
    callContextId: data.contextId,
  });
  if (data.callerName) params.set("callCallerName", data.callerName);
  return `/jobs/${data.contextId}/hired/conversation?${params.toString()}`;
}

export function incomingCallRoute(event: {
  type?: string;
  data?: {
    contextType?: string;
    contextId?: string;
    callId?: string;
    media?: string;
    callerName?: string;
  };
}): string | null {
  if (event.type !== "call.ringing" || event.data?.contextType !== "job") return null;
  return callDeepLink({
    callId: event.data.callId,
    contextId: event.data.contextId,
    media: event.data.media,
    callerName: event.data.callerName,
    action: "open",
  });
}

export function notificationRoute(data: Record<string, string | undefined>): string {
  const type = data.type;
  const jobId = data.jobId;
  if (!type || !allowedTypes.has(type)) return "/notifications";
  if (type === "message" && data.conversationId && safeId(data.conversationId)) return `/messages/${data.conversationId}`;
  if (type === "call" && data.contextType === "job") {
    const route = callDeepLink({
      callId: data.callId,
      contextId: data.contextId,
      media: data.media,
      callerName: data.callerName,
      action: data.action === "cancel" ? "cancel" : data.action === "answer" ? "answer" : "open",
    });
    if (route) return route;
  }
  if (type === "security") return "/profile/sessions";
  if (type === "support") return "/notifications";
  if (!jobId || !safeId(jobId)) return "/notifications";
  if (type === "message") return `/jobs/${jobId}/hired/conversation`;
  if (type === "travel") return `/jobs/${jobId}/hired/travel`;
  if (["completion", "review", "dispute"].includes(type)) return `/jobs/${jobId}/work`;
  if (type === "offer") return `/jobs/${jobId}/offers`;
  return `/jobs/${jobId}/work`;
}

export function deepLinkRoute(url: string, expectedHost: string): string | null {
  try {
    const parsed = new URL(url);
    const validWeb = parsed.protocol === "https:" && parsed.hostname === expectedHost;
    const validCustom = parsed.protocol === "kaila:" && parsed.hostname === "app";
    if (!validWeb && !validCustom) return null;
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return path.startsWith("/") && !path.startsWith("//") ? path : null;
  } catch {
    return null;
  }
}
