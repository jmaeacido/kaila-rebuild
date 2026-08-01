import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const opportunitiesSource = readFileSync(new URL("../opportunities/page.tsx", import.meta.url), "utf8");
const opportunityDetailsSource = readFileSync(new URL("../opportunities/[jobId]/page.tsx", import.meta.url), "utf8");
const jobDetailsSource = readFileSync(new URL("../jobs/[jobId]/page.tsx", import.meta.url), "utf8");

test("Home keeps every non-terminal job active and terminal jobs in history", () => {
  assert.match(source, /const activeClientJobs = jobs\.filter/);
  assert.match(source, /const activeProviderJobs = jobs\.filter/);
  assert.match(source, /activeJobs\.map\(\(job\)/);
  assert.match(source, /\["completed", "rated_closed", "cancelled"\]\.includes\(job\.status\)/);
  assert.doesNotMatch(source, /job\.id !== currentJob\?\.id/);
});

test("Every job-card surface uses its service category icon", () => {
  assert.match(opportunitiesSource, /ServiceCategoryIcon icon=\{item\.category\.icon\}/);
  assert.match(opportunityDetailsSource, /ServiceCategoryIcon icon=\{opportunity\.category\.icon\}/);
  assert.match(jobDetailsSource, /ServiceCategoryIcon icon=\{job\.category\.icon\}/);
});

test("Home renders each job's service category icon", () => {
  assert.match(source, /ServiceCategoryIcon icon=\{job\.category\.icon\}/);
  assert.match(source, /ServiceCategoryIcon icon=\{latestOpportunity\.category\.icon\}/);
  assert.doesNotMatch(source, /<Hammer aria-hidden="true" \/>/);
});
