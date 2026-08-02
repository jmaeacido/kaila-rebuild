export function callStatusEndsMedia(status: string | undefined): boolean {
  return status === "declined" || status === "ended";
}
