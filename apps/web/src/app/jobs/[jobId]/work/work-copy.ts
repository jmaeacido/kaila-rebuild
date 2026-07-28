export function prominentCompletionCopy(
  status: string,
  completionSummary: string | null | undefined,
  currentGuidance: string,
): string {
  return status === "rated_closed"
    ? currentGuidance
    : (completionSummary ?? currentGuidance);
}

export function shouldShowHistoricalCompletionNote(
  status: string,
  completionSummary: string | null | undefined,
): completionSummary is string {
  return status === "rated_closed" && Boolean(completionSummary);
}

export function shouldShowReviewDeadline(
  status: string,
  reviewClosesAt: string | null,
): reviewClosesAt is string {
  return status !== "rated_closed" && Boolean(reviewClosesAt);
}
