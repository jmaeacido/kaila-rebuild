export type NotificationRecord = {
  id: string;
  type: string;
  title: string;
  body: string;
  resourceType: string;
  resourceId: string;
  data: Record<string, string | number | null>;
  readAt: string | null;
  createdAt: string;
};

export function notificationRoute(notification: NotificationRecord): string {
  if (notification.resourceType === "profile_asset" || notification.data.type === "profile") return "/account";
  if (notification.resourceType === "direct_conversation") return "/messages";
  if (notification.resourceType === "support_case" && /^[A-Za-z0-9-]+$/.test(notification.resourceId)) return `/support/${notification.resourceId}`;
  if (notification.resourceType === "call_session" || notification.data.type === "call") {
    const contextId = String(notification.data.contextId ?? "");
    const callId = String(notification.data.callId ?? notification.resourceId);
    if (notification.data.contextType === "job" && /^[A-Za-z0-9-]+$/.test(contextId) && /^[A-Za-z0-9-]+$/.test(callId)) {
      const params = new URLSearchParams({
        callId,
        callAction: notification.data.action === "cancel" ? "cancel" : "open",
        callMedia: String(notification.data.media || "audio"),
        callContextType: "job",
        callContextId: contextId,
      });
      if (typeof notification.data.callerName === "string") params.set("callCallerName", notification.data.callerName);
      if (typeof notification.data.callerAvatarUrl === "string") params.set("callCallerAvatarUrl", notification.data.callerAvatarUrl);
      return `/jobs/${contextId}/hired/conversation?${params.toString()}`;
    }
    return "/notifications";
  }
  const jobId = String(notification.data.jobId ?? notification.resourceId);
  if (notification.resourceType !== "service_job" || !/^[A-Za-z0-9-]+$/.test(jobId)) return "/notifications";
  const routeType = notification.data.type;
  if (routeType === "message") return `/jobs/${jobId}/hired/conversation`;
  if (routeType === "travel") return `/jobs/${jobId}/hired/travel`;
  if (routeType === "offer") return notification.type === "offer.selected" ? `/jobs/${jobId}/work` : `/jobs/${jobId}/offers`;
  if (routeType === "job" && notification.type === "opportunity.matched") return `/opportunities/${jobId}`;
  return `/jobs/${jobId}/work`;
}
