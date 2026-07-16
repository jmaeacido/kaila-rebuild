const allowedTypes = new Set(["job", "offer", "message", "travel", "completion", "dispute", "review", "security", "support"]);

export function notificationRoute(data: Record<string, string | undefined>): string {
  const type = data.type;
  const jobId = data.jobId;
  if (!type || !allowedTypes.has(type)) return "/notifications";
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
