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

/** Status-aware label for the hired-job work entrance / primary work CTA. */
export function workActionLabel(
  role: "client" | "provider",
  status: string,
  surface: "details" | "work" = "details",
): string {
  if (role === "provider") {
    if (status === "working") return "Mark as done";
    if (status === "revision_requested") return "Resume corrections";
    if (status === "provider_selected") {
      return surface === "work" ? "Already on site — start work" : "Start work";
    }
    if (status === "provider_traveling") return "Start work";
    if (status === "completion_submitted") return "Awaiting client review";
    if (status === "completed") return "Leave a review";
  }

  if (role === "client") {
    if (status === "completion_submitted") return "Review completed work";
    if (status === "completed") return "Leave a review";
  }

  return "Work status";
}

