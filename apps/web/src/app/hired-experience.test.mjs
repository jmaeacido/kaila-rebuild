import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const conversation = readFileSync(new URL("./jobs/[jobId]/hired/conversation/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./jobs/[jobId]/hired/hired.module.css", import.meta.url), "utf8");
const travel = readFileSync(new URL("./jobs/[jobId]/hired/travel/page.tsx", import.meta.url), "utf8");
const work = readFileSync(new URL("./jobs/[jobId]/work/page.tsx", import.meta.url), "utf8");
const workStyles = readFileSync(new URL("./jobs/[jobId]/work/work.module.css", import.meta.url), "utf8");
const jobDetails = readFileSync(new URL("./jobs/[jobId]/page.tsx", import.meta.url), "utf8");

test("emoji picker is categorized, scrollable, and constrained to the composer", () => {
  assert.match(conversation, /const emojiGroups =/);
  assert.match(conversation, /Work and places/);
  assert.match(styles, /max-width:calc\(100% - var\(--spacing-24\)\)/);
  assert.match(styles, /overflow-y:auto/);
  assert.match(conversation, /Animals and nature/);
  assert.match(conversation, /Food and drink/);
  assert.match(conversation, /Travel and objects/);
  assert.match(conversation, /const reactions = \["👍", "👎", "❤️"/);
  assert.match(styles, /\.messageRow\.mine \.reactionTray\{left:auto;right:0\}/);
  assert.match(styles, /\.chatWindow \.messages\{overflow-x:hidden\}/);
  assert.match(conversation, /toggleReactionPicker/);
  assert.match(conversation, /trigger\.top - boundary\.top < 190/);
  assert.match(styles, /data-vertical="below"/);
  assert.match(styles, /data-horizontal="right"/);
  assert.match(conversation, /className=\{styles\.chatImage\}/);
  assert.match(conversation, /<MediaViewer assets=\{conversationMedia as ViewableMedia\[\]\}/);
});

test("job calls are rendered as ordered chat timeline events", () => {
  assert.match(conversation, /conversation\.calls\.map/);
  assert.match(conversation, /<CallLogCard call=\{entry\.callLog\}/);
  assert.match(conversation, /Duration \$\{minutes\}/);
});

test("work status keeps the assignment identifiable", () => {
  assert.match(work, /id="job-summary-title"/);
  assert.match(work, /data\.job\.description/);
  assert.match(work, /data\.job\.agreedScope/);
  assert.match(work, /data\.job\.agreedAmountCentavos/);
  assert.match(work, /data\.job\.counterpart\.displayName/);
});

test("work actions keep workflow controls ahead of the full-width report link", () => {
  assert.ok(work.indexOf("Submit completed work") < work.indexOf("Report this job"));
  assert.match(workStyles, /\.actions>button:first-of-type:last-of-type,\.actions>a\{grid-column:1\/-1\}/);
});

test("clean hired-job media can be opened at full size", () => {
  assert.match(jobDetails, /aria-label=\{`Preview \$\{asset\.name\}`\}/);
  assert.match(jobDetails, /className=\{assetStyles\.openAsset\}/);
  assert.match(jobDetails, /<MediaViewer assets=\{viewableMedia as ViewableMedia\[\]\}/);
  assert.doesNotMatch(jobDetails, /target="_blank"/);
});

test("travel distinguishes location failures and can resume native background navigation", () => {
  assert.match(travel, /Live location needs attention/);
  assert.match(travel, /watchId\.current = null/);
  assert.match(travel, /BackgroundNavigation\.start/);
  assert.match(travel, /void retry\(\)/);
  assert.match(travel, /screen locks/);
});
