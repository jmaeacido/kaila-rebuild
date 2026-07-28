import assert from "node:assert/strict";
import test from "node:test";
import {
  prominentCompletionCopy,
  shouldShowHistoricalCompletionNote,
  shouldShowReviewDeadline,
} from "./jobs/[jobId]/work/work-copy.ts";

test("rated jobs show closed-state guidance instead of stale review instructions", () => {
  const submittedSummary = "All agreed work is finished and ready for client review.";
  const closedGuidance = "This job and its review window are closed.";

  assert.equal(
    prominentCompletionCopy("rated_closed", submittedSummary, closedGuidance),
    closedGuidance,
  );
  assert.equal(
    shouldShowHistoricalCompletionNote("rated_closed", submittedSummary),
    true,
  );
  assert.equal(
    shouldShowReviewDeadline("rated_closed", "2026-08-04T17:17:13Z"),
    false,
  );
});

test("active completion review keeps the provider's completion summary prominent", () => {
  const submittedSummary = "Please check the repaired outlet.";

  assert.equal(
    prominentCompletionCopy(
      "completion_submitted",
      submittedSummary,
      "Check the work.",
    ),
    submittedSummary,
  );
  assert.equal(
    shouldShowHistoricalCompletionNote(
      "completion_submitted",
      submittedSummary,
    ),
    false,
  );
  assert.equal(
    shouldShowReviewDeadline("completed", "2026-08-04T17:17:13Z"),
    true,
  );
});
