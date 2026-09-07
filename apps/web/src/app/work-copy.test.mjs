import assert from "node:assert/strict";
import test from "node:test";
import {
  prominentCompletionCopy,
  shouldShowHistoricalCompletionNote,
  shouldShowReviewDeadline,
  workActionLabel,
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

test("provider work CTAs match the lifecycle step, not a generic Start work label", () => {
  assert.equal(workActionLabel("provider", "working"), "Mark as done");
  assert.equal(workActionLabel("provider", "working", "work"), "Mark as done");
  assert.equal(workActionLabel("provider", "provider_selected"), "Start work");
  assert.equal(
    workActionLabel("provider", "provider_selected", "work"),
    "Already on site — start work",
  );
  assert.equal(workActionLabel("provider", "provider_traveling"), "Start work");
  assert.equal(workActionLabel("client", "completion_submitted"), "Review completed work");
});
