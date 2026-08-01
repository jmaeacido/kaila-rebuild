import type { DomainEvent } from "./realtime-provider";

type RealtimeNotification = {
  type: string;
  title: string;
  body: string;
  resourceType: string;
  resourceId: string;
  data: Record<string, unknown>;
};

export type FeedbackMessage = { title: string; body: string; href?: string };

export function feedbackForDomainEvent(event: DomainEvent): FeedbackMessage | null {
  if (event.type === "notification.created") {
    const notification = event.data.notification;
    if (!notification || typeof notification !== "object") return null;
    const record = notification as RealtimeNotification;
    if (typeof record.title !== "string" || typeof record.body !== "string") return null;
    return { title: record.title, body: record.body, href: realtimeNotificationRoute(record) };
  }

  const jobId = typeof event.data.jobId === "string" ? event.data.jobId : null;
  const href = jobId
    ? event.type.startsWith("message.")
      ? `/jobs/${jobId}/hired/conversation`
      : `/jobs/${jobId}`
    : undefined;
  const title = event.type.split(".").map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(" ");

  return { title: title || "KAILA update", body: "This update is now reflected in your job.", href };
}

function realtimeNotificationRoute(notification: RealtimeNotification): string {
  if (notification.resourceType === "direct_conversation" && /^[A-Za-z0-9-]+$/.test(notification.resourceId)) return `/messages/${notification.resourceId}`;
  const jobId = String(notification.data.jobId ?? notification.resourceId);
  if (notification.resourceType !== "service_job" || !/^[A-Za-z0-9-]+$/.test(jobId)) return "/notifications";
  const routeType = notification.data.type;
  if (routeType === "message") return `/jobs/${jobId}/hired/conversation`;
  if (routeType === "travel") return `/jobs/${jobId}/hired/travel`;
  if (routeType === "offer") return notification.type === "offer.selected" ? `/jobs/${jobId}/work` : `/jobs/${jobId}/offers`;
  if (routeType === "job" && notification.type === "opportunity.matched") return `/opportunities/${jobId}`;
  return `/jobs/${jobId}/work`;
}
