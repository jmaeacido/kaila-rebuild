import type { DomainEvent } from "./realtime-provider";

type RealtimeNotification = {
  type: string;
  title: string;
  body: string;
  resourceType: string;
  resourceId: string;
  data: Record<string, unknown>;
};

export type FeedbackMessage = {
  title: string;
  body: string;
  href?: string;
  persistent?: boolean;
  actionLabel?: string;
  eyebrow?: string;
  matchJobId?: string;
};

const ephemeralEventTypes = new Set([
  "conversation.typing.changed",
  "travel.location.changed",
]);

export function isEphemeralRealtimeEvent(type: string): boolean {
  return ephemeralEventTypes.has(type);
}

export function feedbackForDomainEvent(event: DomainEvent): FeedbackMessage | null {
  if (isEphemeralRealtimeEvent(event.type)) return null;
  // Global CallProvider owns incoming/active call UX; avoid duplicate toasts.
  if (event.type === "call.ringing" || event.type === "call.status.changed") return null;

  if (event.type === "notification.created") {
    const notification = event.data.notification;
    if (!notification || typeof notification !== "object") return null;
    const record = notification as RealtimeNotification;
    if (typeof record.title !== "string" || typeof record.body !== "string") return null;
    if (record.type.startsWith("call.") || record.data.type === "call") return null;
    const matched = record.type === "opportunity.matched";
    const jobId = typeof record.data.jobId === "string" ? record.data.jobId : String(record.resourceId);
    return {
      title: matched ? record.body : record.title,
      body: matched ? record.title : record.body,
      href: realtimeNotificationRoute(record),
      persistent: true,
      actionLabel: matched ? "View job" : "View update",
      eyebrow: matched ? "NEW MATCH NEAR YOU" : undefined,
      matchJobId: matched && /^[A-Za-z0-9-]+$/.test(jobId) ? jobId : undefined,
    };
  }

  const jobId = typeof event.data.jobId === "string" ? event.data.jobId : null;
  const href = jobId
    ? event.type.startsWith("message.")
      ? `/jobs/${jobId}/hired/conversation`
      : `/jobs/${jobId}`
    : undefined;
  const title = event.type.split(".").map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(" ");

  return { title: title || "KAILA update", body: "This update is now reflected in your job.", href, actionLabel: href ? "View update" : undefined };
}

function realtimeNotificationRoute(notification: RealtimeNotification): string {
  if (notification.resourceType === "direct_conversation" && /^[A-Za-z0-9-]+$/.test(notification.resourceId)) return `/messages/${notification.resourceId}`;
  if (notification.resourceType === "call_session") {
    const contextId = String(notification.data.contextId ?? "");
    if (notification.data.contextType === "job" && /^[A-Za-z0-9-]+$/.test(contextId)) {
      return `/jobs/${contextId}/hired/conversation`;
    }
    return "/notifications";
  }
  const jobId = String(notification.data.jobId ?? notification.resourceId);
  if (notification.resourceType !== "service_job" || !/^[A-Za-z0-9-]+$/.test(jobId)) return "/notifications";
  const routeType = notification.data.type;
  if (routeType === "call") return `/jobs/${jobId}/hired/conversation`;
  if (routeType === "message") return `/jobs/${jobId}/hired/conversation`;
  if (routeType === "travel") return `/jobs/${jobId}/hired/travel`;
  if (routeType === "offer") return notification.type === "offer.selected" ? `/jobs/${jobId}/work` : `/jobs/${jobId}/offers`;
  if (routeType === "job" && notification.type === "opportunity.matched") return `/opportunities/${jobId}`;
  return `/jobs/${jobId}/work`;
}
