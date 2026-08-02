export function callStatusEndsMedia(status: string | undefined): boolean {
  return status === "declined" || status === "ended";
}

export function nativeCallUpdateEndsMedia(action: string | undefined, status: string | undefined): boolean {
  // Older API builds mislabeled an active/answered update as "cancel". The
  // authoritative active status must win so answering never tears down WebRTC.
  if (status === "active") return false;
  return callStatusEndsMedia(status) || action === "cancel";
}

export function callUpdateDismissesRinging(action: string | undefined, status: string | undefined): boolean {
  return status === "active" || callStatusEndsMedia(status) || action === "dismiss" || action === "cancel";
}
