"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck, Ban, ChevronLeft, HeartHandshake, MapPin, MessageCircle, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Feedback } from "@kaila/ui";
import { CommunityAuthorAvatar } from "../community-author-avatar";
import { CommunityComments } from "../community-comments";
import { CommunityHashtags } from "../community-hashtags";
import { CommunityPostMediaGrid } from "../community-post-media-grid";
import { CommunityPostMediaViewer } from "../community-post-media-viewer";
import { CommunityComment, CommunityPost, csrfFetch, kindLabels } from "../community-client";
import { useRealtimeInvalidation } from "../../use-realtime-invalidation";
import styles from "../community.module.css";

export default function CommunityPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const router = useRouter();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [postResponse, commentsResponse] = await Promise.all([
        fetch(`/api/v1/community/${postId}`, { cache: "no-store" }),
        fetch(`/api/v1/community/${postId}/comments`, { cache: "no-store" }),
      ]);
      if (!postResponse.ok || !commentsResponse.ok) throw new Error();
      setPost(((await postResponse.json()) as { data: CommunityPost }).data);
      setComments(((await commentsResponse.json()) as { data: CommunityComment[] }).data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [postId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useRealtimeInvalidation(() => void load(), (event) => event.resourceType === "community_post" && event.resourceId === postId);

  async function toggle() {
    if (!post) return;
    const next = !post.helpful;
    setPost({ ...post, helpful: next, helpfulCount: Math.max(0, post.helpfulCount + (next ? 1 : -1)) });
    const response = await csrfFetch(`/api/v1/community/${post.id}/helpful`, { method: next ? "PUT" : "DELETE" });
    if (!response.ok) void load();
  }

  async function remove() {
    if (!post || !confirm("Delete this community post?")) return;
    const response = await csrfFetch(`/api/v1/community/${post.id}`, { method: "DELETE" });
    if (response.ok) router.replace("/community");
  }

  async function block() {
    if (!post || !confirm(`Block ${post.author.name}? Their community posts will no longer appear.`)) return;
    const response = await csrfFetch(`/api/v1/community/${post.id}/block-author`, { method: "POST" });
    if (response.ok) router.replace("/community");
  }

  if (status === "loading") {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.skeleton} />
        </div>
      </main>
    );
  }

  if (status === "error" || !post) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <Feedback kind="error" title="Post unavailable">
            <Link href="/community">Back to Community</Link>
          </Feedback>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.top}>
          <Link className={styles.back} href="/community" aria-label="Back to community">
            <ChevronLeft />
          </Link>
          <strong>Community post</strong>
          {post.canManage ? (
            <button className={styles.iconButton} onClick={() => void remove()} aria-label="Delete post">
              <Trash2 />
            </button>
          ) : (
            <Link className={styles.iconButton} href={`/safety?targetType=community_post&targetId=${post.id}`} aria-label="Report post">
              <AlertTriangle />
            </Link>
          )}
        </div>
        <article className={styles.card}>
          <div className={styles.cardBody}>
            <div className={styles.author}>
              <CommunityAuthorAvatar official={post.author.official} />
              <span className={styles.authorText}>
                <strong>
                  {post.author.name} {post.author.official && <BadgeCheck className={styles.badge} aria-label="Official KAILA" />}
                </strong>
                <small>
                  {kindLabels[post.kind]}
                  {post.areaLabel && (
                    <>
                      {" "}
                      · <MapPin size={12} /> {post.areaLabel}
                    </>
                  )}
                </small>
              </span>
            </div>
            <h1>{post.title}</h1>
            <p className={styles.body}>{post.body}</p>
            <CommunityHashtags tags={post.hashtags} />
            <p className={styles.meta}>
              {new Date(post.publishedAt).toLocaleString()}
              {post.editedAt && " · Edited"}
            </p>
          </div>
          {post.media.length > 0 && <CommunityPostMediaGrid media={post.media} onMediaClick={setViewerIndex} />}
          <div className={styles.engagementRow}>
            <button className={`${styles.engagementButton} ${post.helpful ? styles.engagementButtonActive : ""}`} data-flat-button type="button" onClick={() => void toggle()}>
              <HeartHandshake aria-hidden="true" />
              Helpful · {post.helpfulCount}
            </button>
            <span className={styles.engagementStat}>
              <MessageCircle aria-hidden="true" />
              {post.commentsCount} comments
            </span>
          </div>
          {post.canManage ? (
            <div className={styles.secondaryActions}>
              <Link href={`/community/${post.id}/edit`}>
                <Pencil aria-hidden="true" />
                Edit post
              </Link>
              <button type="button" data-flat-button onClick={() => void remove()}>
                <Trash2 aria-hidden="true" />
                Delete post
              </button>
            </div>
          ) : (
            !post.author.official && (
              <div className={styles.secondaryActions}>
                <button type="button" data-flat-button onClick={() => void block()}>
                  <Ban aria-hidden="true" />
                  Block author
                </button>
              </div>
            )
          )}
        </article>
        <CommunityComments postId={post.id} comments={comments} reload={load} />
        {viewerIndex !== null && (
          <CommunityPostMediaViewer
            post={post}
            initialMediaIndex={viewerIndex}
            initialComments={comments}
            onClose={() => setViewerIndex(null)}
            onPostChange={setPost}
          />
        )}
      </div>
    </main>
  );
}
