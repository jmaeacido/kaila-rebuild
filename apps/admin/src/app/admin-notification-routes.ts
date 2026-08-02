const safeId = (value: string | undefined): value is string =>
  Boolean(value && /^[A-Za-z0-9-]+$/.test(value));

export function adminNotificationRoute(data: Record<string, string | undefined>): string {
  const eventType = data.eventType ?? "";
  const resourceType = data.resourceType ?? "";

  if (eventType.startsWith("report.") || resourceType === "moderation_report") {
    return safeId(data.reportId) ? `/reports?report=${encodeURIComponent(data.reportId)}` : "/reports";
  }
  if (eventType.startsWith("dispute.") || resourceType === "dispute_case") {
    return safeId(data.caseId) ? `/cases?case=${encodeURIComponent(data.caseId)}` : "/cases";
  }
  if (eventType.startsWith("support.") || resourceType === "support_case") {
    return safeId(data.caseId) ? `/support?case=${encodeURIComponent(data.caseId)}` : "/support";
  }
  if (
    eventType.startsWith("admin.review.") ||
    ["provider_profile", "provider_credential", "profile_asset", "message_asset"].includes(resourceType)
  ) {
    return "/";
  }

  return "/";
}
