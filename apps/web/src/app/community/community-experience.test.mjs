import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const feed = readFileSync(new URL("./community-feed.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("./[postId]/community-post-detail.tsx", import.meta.url), "utf8");
const composer = readFileSync(new URL("./share/page.tsx", import.meta.url), "utf8");
const storyComposer = readFileSync(new URL("./community-story-composer.tsx", import.meta.url), "utf8");

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
  assert.match(comments, /mentionedUserId/);
  assert.match(comments, /CommunityCommentMentionField/);
  assert.match(comments, /CommunityLinkedMentionText/);
  assert.match(readFileSync(new URL("./community-provider-mention.tsx", import.meta.url), "utf8"), /\/api\/v1\/community\/mention-candidates/);
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
  const mention = readFileSync(new URL("./community-provider-mention.tsx", import.meta.url), "utf8");
  assert.match(storyComposer, /slice\(0, 4\)/);
  assert.match(storyComposer, /accept="image\/\*"/);
  assert.match(storyComposer, /file\.type\.startsWith\("image\/"\)/);
  assert.match(storyComposer, /ImagePlus/);
  assert.match(storyComposer, /selectedMention/);
  assert.match(storyComposer, /ProviderMentionMenu/);
  assert.match(mention, /\/api\/v1\/community\/mention-candidates/);
  assert.match(mention, /AtSign/);
  assert.doesNotMatch(storyComposer, /optimized to WebP/);
  assert.match(composer, /CommunityStoryComposer/);
  assert.match(composer, /mentionedUserId/);
  assert.doesNotMatch(composer, /CommunityMediaPicker/);
  assert.match(composer, /areaId: null/);
  assert.doesNotMatch(composer, /AddressHierarchy/);
  assert.match(composer, /Official KAILA update/);
  assert.match(composer, /official: kind === "official_update"/);
});

test("community feed includes marketplace navigation with Community active", () => {
  assert.match(feed, /<MarketplaceNavigation active="community" \/>/);
});

test("community welcome posts link the featured provider name to their public profile", () => {
  const welcome = readFileSync(new URL("./community-welcome-content.tsx", import.meta.url), "utf8");
  assert.match(welcome, /featuredProviderLink/);
  assert.match(welcome, /\/providers\/\$\{provider\.id\}/);
  assert.match(welcome, /newprovider/);
  assert.match(feed, /CommunityWelcomeTitle/);
  assert.match(feed, /CommunityWelcomeBody/);
  assert.match(detail, /CommunityWelcomeTitle/);
  assert.match(detail, /CommunityWelcomeBody/);
});

test("community notifications deep-link to the welcome post", () => {
  const route = readFileSync(new URL("../notification-route.ts", import.meta.url), "utf8");
  assert.match(route, /resourceType === "community_post"/);
});

test("community post pages are server-rendered for SEO", () => {
  const postPage = readFileSync(new URL("./[postId]/page.tsx", import.meta.url), "utf8");
  assert.match(postPage, /generateMetadata/);
  assert.match(postPage, /fetchPublicCommunityPost/);
  assert.match(postPage, /CommunityPostDetail/);
});

test("community feed uses a desktop three-column layout with browse and discover rails", () => {
  const css = readFileSync(new URL("./community.module.css", import.meta.url), "utf8");
  assert.match(feed, /CommunityBrowseRail/);
  assert.match(feed, /CommunityDiscoverRail/);
  assert.match(feed, /\/api\/v1\/community\/feed-context/);
  assert.match(css, /grid-template-columns:minmax\(12rem,15rem\) minmax\(0,45rem\) minmax\(13rem,18\.75rem\)/);
  assert.match(css, /linear-gradient\(90deg/);
});
