const safeId = (value: string | undefined): value is string =>
  Boolean(value && /^[A-Za-z0-9-]+$/.test(value));

export function adminNotificationRoute(data: Record<string, string | undefined>): string {
  const eventType = data.eventType ?? "";
  const resourceType = data.resourceType ?? "";
  const resourceId = data.resourceId;

  if (eventType.startsWith("admin.identity.") || resourceType === "identity_verification") {
    const id = data.verificationId ?? resourceId;
    return safeId(id) ? `/identity-verifications#identity-${id}` : "/identity-verifications";
  }
  if (eventType.startsWith("report.") || resourceType === "moderation_report") {
    return safeId(data.reportId) ? `/reports?report=${encodeURIComponent(data.reportId)}` : "/reports";
  }
  if (eventType.startsWith("dispute.") || resourceType === "dispute_case") {
    return safeId(data.caseId) ? `/cases?case=${encodeURIComponent(data.caseId)}` : "/cases";
  }
  if (eventType.startsWith("support.") || resourceType === "support_case") {
    if (!safeId(data.caseId)) return "/support";
    const query = new URLSearchParams({ case: data.caseId });
    if (safeId(data.messageId)) query.set("message", data.messageId);
    return `/support?${query.toString()}`;
  }
  if (
    eventType === "ops.android_test_access_request" ||
    resourceType === "android_internal_test_request"
  ) {
    return safeId(data.requestId)
      ? `/early-access?request=${encodeURIComponent(data.requestId)}`
      : "/early-access";
  }
  if (
    eventType.startsWith("admin.review.") ||
    ["provider_profile", "provider_credential", "profile_asset", "message_asset"].includes(resourceType)
  ) {
    const id = data.providerProfileId ?? data.credentialId ?? data.profileAssetId ?? resourceId;
    if (!safeId(id)) return "/";
    if (resourceType === "provider_profile") return `/#provider-${id}`;
    if (resourceType === "provider_credential") return `/#credential-${id}`;
    return `/#asset-${id}`;
  }

  return "/";
}
