import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const feed = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("./[postId]/page.tsx", import.meta.url), "utf8");
const composer = readFileSync(new URL("./share/page.tsx", import.meta.url), "utf8");
const storyComposer = readFileSync(new URL("./community-story-composer.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../home/page.tsx", import.meta.url), "utf8");

test("community feed exposes filters, pagination, and realtime reconciliation", () => {
  const constants = readFileSync(new URL("./community-constants.ts", import.meta.url), "utf8");
  assert.match(constants, /work_story/);
  assert.match(constants, /official_update/);
  assert.match(feed, /nextCursor/);
  assert.match(feed, /useRealtimeInvalidation/);
  assert.match(feed, /tag=/);
});

test("community feed renders server-provided hashtags as filter links", () => {
  assert.match(feed, /CommunityHashtags/);
  assert.match(feed, /post\.hashtags/);
});

test("community detail includes the approved interaction and safety controls", () => {
  const comments = readFileSync(new URL("./community-comments.tsx", import.meta.url), "utf8");
  for (const behavior of ["helpful", "CommunityComments", "targetType=community_post", "block-author", "/edit", "DELETE"]) assert.match(detail, new RegExp(behavior));
  assert.match(comments, /CommunityMemberAvatar/);
  assert.match(comments, /avatarUrl/);
  assert.match(comments, /canEdit/);
  assert.match(comments, /canHide/);
  assert.match(comments, /community-comments/);
});

test("community media opens a fullscreen viewer with react and comment support", () => {
  const grid = readFileSync(new URL("./community-post-media-grid.tsx", import.meta.url), "utf8");
  const viewer = readFileSync(new URL("./community-post-media-viewer.tsx", import.meta.url), "utf8");
  assert.match(grid, /onMediaClick/);
  assert.match(viewer, /createPortal/);
  assert.match(viewer, /CommunityCommentComposer/);
  assert.match(viewer, /Helpful/);
  assert.match(viewer, /mobileBarTitle/);
  assert.match(viewer, /CommunityHashtags/);
  assert.match(viewer, /mediaColumn/);
  assert.match(viewer, /sideColumn/);
  const viewerCss = readFileSync(new URL("./community-media-viewer.module.css", import.meta.url), "utf8");
  assert.match(viewerCss, /env\(safe-area-inset-top/);
  assert.match(viewerCss, /env\(safe-area-inset-bottom/);
  assert.match(viewerCss, /\.panel/);
  assert.match(viewerCss, /mediaColumn/);
  assert.match(viewerCss, /sideColumn/);
  assert.match(viewerCss, /overflow-y:auto/);
  assert.match(feed, /CommunityPostMediaViewer/);
  assert.match(detail, /CommunityPostMediaViewer/);
});

test("community media grid uses a hero plus two squares for three attachments", () => {
  const grid = readFileSync(new URL("./community-post-media-grid.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("./community.module.css", import.meta.url), "utf8");
  assert.match(feed, /CommunityPostMediaGrid/);
  assert.match(detail, /CommunityPostMediaGrid/);
  assert.match(grid, /mediaCount3/);
  assert.match(css, /mediaCount3/);
  assert.match(css, /grid-column:1\/-1/);
  assert.match(css, /aspect-ratio:1\/1/);
});

test("community composer limits images and publishes without area selection", () => {
  assert.match(storyComposer, /slice\(0, 4\)/);
  assert.match(storyComposer, /accept="image\/\*"/);
  assert.match(storyComposer, /file\.type\.startsWith\("image\/"\)/);
  assert.match(storyComposer, /ImagePlus/);
  assert.doesNotMatch(storyComposer, /optimized to WebP/);
  assert.match(composer, /CommunityStoryComposer/);
  assert.doesNotMatch(composer, /CommunityMediaPicker/);
  assert.match(composer, /areaId: null/);
  assert.doesNotMatch(composer, /AddressHierarchy/);
  assert.match(composer, /Official KAILA update/);
  assert.match(composer, /official: kind === "official_update"/);
});

test("community feed includes marketplace navigation with Community active", () => {
  assert.match(feed, /<MarketplaceNavigation active="community" \/>/);
});

test("community feed uses a desktop three-column layout with browse and discover rails", () => {
  const css = readFileSync(new URL("./community.module.css", import.meta.url), "utf8");
  assert.match(feed, /CommunityBrowseRail/);
  assert.match(feed, /CommunityDiscoverRail/);
  assert.match(feed, /\/api\/v1\/community\/feed-context/);
  assert.match(css, /grid-template-columns:minmax\(12rem,15rem\) minmax\(0,45rem\) minmax\(13rem,18\.75rem\)/);
  assert.match(css, /linear-gradient\(90deg/);
});
