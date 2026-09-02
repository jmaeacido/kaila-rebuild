"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, ChevronLeft, ChevronRight, HeartHandshake, MapPin, MessageCircle, X } from "lucide-react";
import { CommunityAuthorAvatar } from "./community-author-avatar";
import { CommunityCommentComposer, CommunityCommentsList } from "./community-comments";
import { CommunityHashtags } from "./community-hashtags";
import { CommunityWelcomeBody, CommunityWelcomeTitle } from "./community-welcome-content";
import { CommunityComment, CommunityPost, csrfFetch, kindLabels } from "./community-client";
import { useRealtimeInvalidation } from "../use-realtime-invalidation";
import viewerStyles from "./community-media-viewer.module.css";
import styles from "./community.module.css";

type CommunityPostMediaViewerProps = {
  post: CommunityPost;
  initialMediaIndex: number;
  onClose: () => void;
  onPostChange?: (post: CommunityPost) => void;
  initialComments?: CommunityComment[];
};

export function CommunityPostMediaViewer({
  post,
  initialMediaIndex,
  onClose,
  onPostChange,
  initialComments,
}: CommunityPostMediaViewerProps) {
  const media = post.media.filter((item) => item.url);
  const [index, setIndex] = useState(initialMediaIndex);
  const [currentPost, setCurrentPost] = useState(post);
  const [comments, setComments] = useState<CommunityComment[]>(initialComments ?? []);
  const [commentsReady, setCommentsReady] = useState(Boolean(initialComments));

  const asset = media[index] ?? media[0];

  const loadComments = useCallback(async () => {
    const response = await fetch(`/api/v1/community/${currentPost.id}/comments`, { cache: "no-store" });
    if (!response.ok) return;
    setComments(((await response.json()) as { data: CommunityComment[] }).data);
    setCommentsReady(true);
  }, [currentPost.id]);

  const reloadPost = useCallback(async () => {
    const response = await fetch(`/api/v1/community/${currentPost.id}`, { cache: "no-store" });
    if (!response.ok) return;
    const updated = ((await response.json()) as { data: CommunityPost }).data;
    setCurrentPost(updated);
    onPostChange?.(updated);
  }, [currentPost.id, onPostChange]);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadComments(), reloadPost()]);
  }, [loadComments, reloadPost]);

  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentPost(post), 0);
    return () => window.clearTimeout(timer);
  }, [post]);

  useEffect(() => {
    if (initialComments) {
      const timer = window.setTimeout(() => {
        setComments(initialComments);
        setCommentsReady(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      void loadComments();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialComments, loadComments]);

  useEffect(() => {
    const html = document.documentElement;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = html.style.overflow;
    document.body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && media.length > 1) setIndex((current) => (current - 1 + media.length) % media.length);
      if (event.key === "ArrowRight" && media.length > 1) setIndex((current) => (current + 1) % media.length);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = bodyOverflow;
      html.style.overflow = htmlOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [media.length, onClose]);

  useRealtimeInvalidation(() => void reloadAll(), (event) => event.resourceType === "community_post" && event.resourceId === currentPost.id);

  async function toggleHelpful() {
    const next = !currentPost.helpful;
    const optimistic = {
      ...currentPost,
      helpful: next,
      helpfulCount: Math.max(0, currentPost.helpfulCount + (next ? 1 : -1)),
    };
    setCurrentPost(optimistic);
    onPostChange?.(optimistic);
    const response = await csrfFetch(`/api/v1/community/${currentPost.id}/helpful`, { method: next ? "PUT" : "DELETE" });
    if (!response.ok) await reloadPost();
  }

  if (!asset?.url) return null;

  return createPortal(
    <div
      className={viewerStyles.viewer}
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-media-viewer-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={viewerStyles.panel}>
        <header className={viewerStyles.mobileBar}>
          <button type="button" className={viewerStyles.iconButton} data-flat-button onClick={onClose} aria-label="Close media viewer">
            <X aria-hidden="true" />
          </button>
          <p className={viewerStyles.mobileBarTitle}>
            {media.length > 1 ? `Photo ${index + 1} of ${media.length}` : currentPost.title}
          </p>
          <Link className={viewerStyles.openPost} href={`/community/${currentPost.id}`}>
            Open post
          </Link>
        </header>

        <div className={viewerStyles.mediaColumn}>
          <button type="button" className={viewerStyles.desktopClose} data-flat-button onClick={onClose} aria-label="Close media viewer">
            <X aria-hidden="true" />
          </button>
          {media.length > 1 && <span className={viewerStyles.stageCounter}>{index + 1} / {media.length}</span>}
          <div className={viewerStyles.stage}>
            {media.length > 1 && (
              <button type="button" className={`${viewerStyles.navButton} ${viewerStyles.navPrevious}`} data-flat-button onClick={() => setIndex((current) => (current - 1 + media.length) % media.length)} aria-label="Previous photo">
                <ChevronLeft aria-hidden="true" />
              </button>
            )}
            <Image unoptimized priority src={asset.url} alt={asset.originalName} width={1080} height={1440} className={viewerStyles.stageImage} />
            {media.length > 1 && (
              <button type="button" className={`${viewerStyles.navButton} ${viewerStyles.navNext}`} data-flat-button onClick={() => setIndex((current) => (current + 1) % media.length)} aria-label="Next photo">
                <ChevronRight aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <aside className={viewerStyles.sideColumn}>
          <header className={viewerStyles.sideHeader}>
            <div className={viewerStyles.authorRow}>
              <CommunityAuthorAvatar official={currentPost.author.official} />
              <div className={viewerStyles.authorText}>
                <strong id="community-media-viewer-title">
                  {currentPost.author.name} {currentPost.author.official && <BadgeCheck className={styles.badge} aria-label="Official KAILA" />}
                </strong>
                <small>
                  {kindLabels[currentPost.kind] ?? currentPost.kind}
                  {currentPost.areaLabel && (
                    <>
                      {" · "}
                      <MapPin size={12} aria-hidden="true" />
                      {currentPost.areaLabel}
                    </>
                  )}
                  {" · "}
                  {new Date(currentPost.publishedAt).toLocaleString()}
                </small>
              </div>
            </div>
            <Link className={viewerStyles.sideOpenPost} href={`/community/${currentPost.id}`}>
              Open post
            </Link>
          </header>

          <div className={viewerStyles.sideScroll}>
            <CommunityWelcomeTitle post={currentPost} postHref={`/community/${currentPost.id}`} className={viewerStyles.title} />
            <CommunityWelcomeBody post={currentPost} className={viewerStyles.preview} />
            <CommunityHashtags tags={currentPost.hashtags} />

            <div className={`${styles.engagementRow} ${viewerStyles.viewerEngagement}`}>
              <button
                type="button"
                className={`${styles.engagementButton} ${currentPost.helpful ? styles.engagementButtonActive : ""}`}
                data-flat-button
                onClick={() => void toggleHelpful()}
              >
                <HeartHandshake aria-hidden="true" />
                Helpful · {currentPost.helpfulCount}
              </button>
              <span className={styles.engagementStat}>
                <MessageCircle aria-hidden="true" />
                {currentPost.commentsCount} comments
              </span>
            </div>

            {commentsReady ? (
              <CommunityCommentsList postId={currentPost.id} comments={comments} reload={reloadAll} variant="viewer" />
            ) : (
              <div className={viewerStyles.commentsLoading}>Loading comments…</div>
            )}
          </div>

          <footer className={viewerStyles.composerDock}>
            <CommunityCommentComposer postId={currentPost.id} reload={reloadAll} compact placeholder="Write a helpful comment" submitLabel="Send comment" />
          </footer>
        </aside>
      </div>
    </div>,
    document.body,
  );
}
