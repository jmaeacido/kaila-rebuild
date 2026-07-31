const allowedTypes = new Set(["job", "offer", "message", "call", "travel", "completion", "dispute", "review", "security", "support"]);

export function incomingCallRoute(event: {
  type?: string;
  data?: { contextType?: string; contextId?: string };
}): string | null {
  const contextId = event.data?.contextId;
  return event.type === "call.ringing"
    && event.data?.contextType === "job"
    && Boolean(contextId && /^[A-Za-z0-9-]+$/.test(contextId))
    ? `/jobs/${contextId}/hired/conversation`
    : null;
}

export function notificationRoute(data: Record<string, string | undefined>): string {
  const type = data.type;
  const jobId = data.jobId;
  if (!type || !allowedTypes.has(type)) return "/notifications";
  if (type === "message" && data.conversationId && /^[A-Za-z0-9-]+$/.test(data.conversationId)) return `/messages/${data.conversationId}`;
  if (
    type === "call"
    && data.contextType === "job"
    && data.contextId
    && /^[A-Za-z0-9-]+$/.test(data.contextId)
  ) return `/jobs/${data.contextId}/hired/conversation`;
  if (type === "security") return "/profile/sessions";
  if (type === "support") return "/notifications";
  if (!jobId || !/^[A-Za-z0-9-]+$/.test(jobId)) return "/notifications";
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
