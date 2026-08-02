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
  kind?: string;
  maintenanceEndsAt?: number;
  maintenanceScheduledAt?: string;
};

const ephemeralEventTypes = new Set([
  "conversation.typing.changed",
  "travel.location.changed",
  "message.read",
  "message.reacted",
  "message.asset.updated",
  "profile.media.updated",
  "opportunity.updated",
  "notification.read",
  "notification.read_all",
]);

/** Domain mutations that also emit `notification.created` must not toast twice. */
const notificationBackedEventTypes = new Set([
  "job.posted",
  "job.updated",
  "job.draft_updated",
  "job.media.updated",
  "job.state.changed",
  "opportunity.matched",
  "offer.created",
  "offer.revised",
  "offer.selected",
  "offer.rejected",
  "offer.withdrawn",
  "message.created",
  "travel.started",
  "travel.arrival.changed",
  "travel.stopped",
  "direct.conversation.requested",
  "direct.conversation.accepted",
  "direct.message.created",
  "community.post.published",
  "community.post.updated",
  "profile.updated",
  "support.case.created",
  "support.message.created",
  "support.case.updated",
  "support.case.open",
  "support.case.waiting_for_support",
  "support.case.waiting_for_customer",
  "support.case.resolved",
  "support.case.closed",
]);

export function isEphemeralRealtimeEvent(type: string): boolean {
  return ephemeralEventTypes.has(type);
}

/** Events that also emit `notification.created` — sound/toast once via that path. */
export function isNotificationBackedRealtimeEvent(type: string): boolean {
  return notificationBackedEventTypes.has(type);
}

export function feedbackForDomainEvent(event: DomainEvent): FeedbackMessage | null {
  if (isEphemeralRealtimeEvent(event.type)) return null;
  // Global CallProvider owns incoming/active call UX; avoid duplicate toasts.
  if (event.type === "call.ringing" || event.type === "call.status.changed") return null;
  if (notificationBackedEventTypes.has(event.type)) return null;

  if (event.type === "notification.created") {
    const notification = event.data.notification;
    if (!notification || typeof notification !== "object") return null;
    const record = notification as RealtimeNotification;
    if (typeof record.title !== "string" || typeof record.body !== "string") return null;
    if (record.type.startsWith("call.") || record.data.type === "call") return null;
    if (record.data.hideFromInbox === "1" || record.data.hideFromInbox === true) return null;
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

  if (event.type === "platform.maintenance.scheduled") {
    const message = typeof event.data.message === "string" ? event.data.message : "KAILA will pause for maintenance soon.";
    const scheduledAt = typeof event.data.scheduledAt === "string" ? event.data.scheduledAt : null;
    const endsAtFromSchedule = scheduledAt ? Date.parse(scheduledAt) : Number.NaN;
    const seconds = typeof event.data.secondsRemaining === "number"
      ? event.data.secondsRemaining
      : typeof event.data.countdownSeconds === "number"
        ? event.data.countdownSeconds
        : 60;
    return {
      title: "Maintenance starting soon",
      body: message,
      persistent: true,
      eyebrow: "PLATFORM NOTICE",
      kind: "maintenance-countdown",
      maintenanceScheduledAt: scheduledAt ?? undefined,
      maintenanceEndsAt: Number.isFinite(endsAtFromSchedule)
        ? endsAtFromSchedule
        : Date.now() + Math.max(0, seconds) * 1000,
    };
  }

  if (event.type === "platform.maintenance.cancelled") {
    return {
      title: "Maintenance cancelled",
      body: typeof event.data.message === "string" ? event.data.message : "Scheduled maintenance was cancelled.",
      persistent: false,
      eyebrow: "PLATFORM NOTICE",
      kind: "maintenance-cancelled",
    };
  }

  if (event.type === "platform.maintenance.activated") {
    // Redirect handles awareness; a toast would linger after users leave /maintenance.
    return null;
  }

  if (event.type === "platform.maintenance.ended") {
    // The maintenance page already shows "back online"; avoid a leftover toast after Continue.
    return null;
  }

  return null;
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
