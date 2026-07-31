import type { DomainEvent } from "./realtime-provider";

export type FeedbackMessage = { title: string; body: string; href?: string };

export function feedbackForDomainEvent(event: DomainEvent): FeedbackMessage | null {
  if (event.type !== "notification.created") return null;
  const notification = event.data.notification;
  if (!notification || typeof notification !== "object") return null;
  const record = notification as Record<string, unknown>;
  if (typeof record.title !== "string" || typeof record.body !== "string") return null;
  return { title: record.title, body: record.body, href: "/notifications" };
}
