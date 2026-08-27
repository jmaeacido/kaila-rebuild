import { Bell, BriefcaseBusiness, Headphones, MessageCircle, Phone, UserRound } from "lucide-react";
import type { NotificationRecord } from "./notification-route";

export function NotificationGlyph({ item, className }: { item: NotificationRecord; className?: string }) {
  const props = { "aria-hidden": true, className } as const;
  if (item.resourceType === "profile_asset" || item.data.type === "profile") return <UserRound {...props} />;
  if (item.resourceType === "support_case") return <Headphones {...props} />;
  if (item.resourceType === "direct_conversation" || item.data.type === "message") return <MessageCircle {...props} />;
  if (item.resourceType === "call_session" || item.data.type === "call") return <Phone {...props} />;
  if (item.resourceType === "service_job") return <BriefcaseBusiness {...props} />;
  return <Bell {...props} />;
}
