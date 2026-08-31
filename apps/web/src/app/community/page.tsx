"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, ChevronLeft, HeartHandshake, MapPin, MessageCircle, Plus, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Feedback } from "@kaila/ui";
import { MarketplaceNavigation } from "../../components/marketplace-navigation";
import { useMarketplaceMode } from "../use-marketplace-mode";
import { CommunityAuthorAvatar } from "./community-author-avatar";
import { CommunityBrowseRail } from "./community-browse-rail";
import { CommunityDiscoverRail } from "./community-discover-rail";
import { communityFilters } from "./community-constants";
import { CommunityHashtags } from "./community-hashtags";
import { CommunityPostMediaGrid } from "./community-post-media-grid";
import { CommunityPostMediaViewer } from "./community-post-media-viewer";
import { CommunityFeedContext, CommunityPost, csrfFetch, kindLabels } from "./community-client";
import { useRealtimeInvalidation } from "../use-realtime-invalidation";
import styles from "./community.module.css";

export default function CommunityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tag = searchParams.get("tag")?.toLowerCase() ?? "";
  const { isProvider } = useMarketplaceMode();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [feedContext, setFeedContext] = useState<CommunityFeedContext | null>(null);
  const [contextReady, setContextReady] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ post: CommunityPost; index: number } | null>(null);

  const loadContext = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/community/feed-context", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setFeedContext(((await response.json()) as { data: CommunityFeedContext }).data);
    } catch {
      setFeedContext(null);
    } finally {
      setContextReady(true);
    }
  }, []);

  const load = useCallback(async (append = false) => {
    try {
      const query = new URLSearchParams();
      if (filter) query.set("kind", filter);
      if (tag) query.set("tag", tag);
      if (append && cursor) query.set("cursor", cursor);
      const response = await fetch(`/api/v1/community?${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const result = await response.json() as { data: CommunityPost[]; meta: { nextCursor: string | null } };
      setPosts((current) => append ? [...current, ...result.data] : result.data);
      setCursor(result.meta.nextCursor);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [cursor, filter, tag]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStatus("loading");
      setCursor(null);
      void load(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [filter, tag]); // eslint-disable-line react-hooks/exhaustive-deps

  useRealtimeInvalidation(() => {
    void load(false);
    void loadContext();
  }, (event) => event.resourceType === "community_post");

  async function toggle(post: CommunityPost) {
    setPosts((items) => items.map((item) => item.id === post.id ? { ...item, helpful: !item.helpful, helpfulCount: Math.max(0, item.helpfulCount + (item.helpful ? -1 : 1)) } : item));
    const response = await csrfFetch(`/api/v1/community/${post.id}/helpful`, { method: post.helpful ? "DELETE" : "PUT" });
    if (!response.ok) void load(false);
  }

  function clearTagFilter() {
    router.replace("/community");
  }

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <CommunityBrowseRail
          filter={filter}
          tag={tag}
          homeArea={feedContext?.homeArea ?? null}
          onFilterChange={setFilter}
          onClearTag={clearTagFilter}
        />

        <div className={styles.feedColumn}>
          <div className={styles.shell}>
            <div className={styles.top}>
              <Link className={styles.back} href="/home" aria-label="Back home"><ChevronLeft /></Link>
              <strong>Community</strong>
              <Link className={styles.iconButton} href="/community/share" aria-label="Create post"><Plus /></Link>
            </div>
            <section className={styles.hero}>
              <span className={styles.eyebrow}>KAILA Community</span>
              <h1>Local help, shared</h1>
              <p>Real work, useful advice, and service questions from nearby people.</p>
            </section>
            <Link className={styles.compose} href="/community/share">
              <span className={styles.avatar}><UserRound /></span>
              <span>Share a useful story or question…</span>
            </Link>
            <div className={styles.chips} role="tablist" aria-label="Filter community posts">
              {communityFilters.map((item) => (
                <button
                  className={`${styles.chip} ${filter === item.value ? styles.chipActive : ""}`}
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.value}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {tag ? (
              <div className={styles.tagFilterRow}>
                <Link className={`${styles.hashtag} ${styles.hashtagActive}`} href={`/community?tag=${encodeURIComponent(tag)}`} aria-current="page">#{tag}</Link>
                <button className={styles.tagFilterClear} type="button" onClick={clearTagFilter} aria-label="Clear hashtag filter">
                  <X aria-hidden="true" />
                  Clear
                </button>
              </div>
            ) : null}
            <div className={styles.list}>
              {status === "loading" && <><div className={styles.skeleton} /><div className={styles.skeleton} /></>}
              {status === "error" && (
                <Feedback kind="error" title="Community could not load">
                  <button className={styles.loadMore} type="button" onClick={() => void load(false)}>Try again</button>
                </Feedback>
              )}
              {status === "ready" && posts.length === 0 && (
                <div className={styles.empty}>
                  <HeartHandshake />
                  <h2>{tag ? "No posts for this hashtag yet" : "No posts here yet"}</h2>
                  <p>{tag ? "Try another tag or share the first related update." : "Share the first useful local update."}</p>
                </div>
              )}
              {posts.map((post) => (
                <article className={styles.card} key={post.id}>
                  <div className={styles.cardBody}>
                    <div className={styles.author}>
                      <CommunityAuthorAvatar official={post.author.official} />
                      <span className={styles.authorText}>
                        <strong>
                          {post.author.name}
                          {post.author.official && <BadgeCheck className={styles.badge} aria-label="Official KAILA" />}
                        </strong>
                        <small>
                          {kindLabels[post.kind] ?? post.kind}
                          {post.areaLabel && <> · <MapPin size={12} /> {post.areaLabel}</>}
                        </small>
                      </span>
                    </div>
                    <Link href={`/community/${post.id}`}><h2>{post.title}</h2></Link>
                    <p className={styles.body}>{post.body.length > 360 ? `${post.body.slice(0, 360)}…` : post.body}</p>
                    <CommunityHashtags tags={post.hashtags} compact />
                  </div>
                  {post.media.length > 0 && (
                    <CommunityPostMediaGrid media={post.media} onMediaClick={(index) => setViewer({ post, index })} />
                  )}
                  <div className={styles.engagementRow}>
                    <button
                      className={`${styles.engagementButton} ${post.helpful ? styles.engagementButtonActive : ""}`}
                      data-flat-button
                      type="button"
                      onClick={() => void toggle(post)}
                    >
                      <HeartHandshake aria-hidden="true" />
                      Helpful · {post.helpfulCount}
                    </button>
                    <Link className={styles.engagementStat} href={`/community/${post.id}`}>
                      <MessageCircle aria-hidden="true" />
                      Comment · {post.commentsCount}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            {cursor && status === "ready" ? (
              <button className={styles.loadMore} type="button" onClick={() => void load(true)}>Load more</button>
            ) : null}
          </div>
        </div>

        <CommunityDiscoverRail context={feedContext} isProvider={isProvider} ready={contextReady} />
      </div>

      {viewer ? (
        <CommunityPostMediaViewer
          post={viewer.post}
          initialMediaIndex={viewer.index}
          onClose={() => setViewer(null)}
          onPostChange={(updated) => {
            setPosts((items) => items.map((item) => (item.id === updated.id ? updated : item)));
            setViewer((current) => (current ? { ...current, post: updated } : null));
          }}
        />
      ) : null}

      <MarketplaceNavigation active="community" />
    </main>
  );
}
