"use client";

import { useCallback, useEffect, useState } from "react";
import { HeartHandshake, MapPin } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import Link from "next/link";
import styles from "../phase-nine.module.css";

type Post = { id: string; kind: string; title: string; body: string; areaLabel: string | null; author: { name: string } | null; helpfulCount: number };

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]); const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const load = useCallback(async () => { try { const response = await fetch("/api/v1/community"); if (!response.ok) throw new Error(); setPosts(((await response.json()) as { data: Post[] }).data); setState("ready"); } catch { setState("error"); } }, []);
  useEffect(() => { void fetch("/api/v1/community").then(async (response) => { if (!response.ok) throw new Error(); setPosts(((await response.json()) as { data: Post[] }).data); setState("ready"); }).catch(() => setState("error")); }, []);
  return <main className={styles.page}><header className={styles.header}><Link href="/">Back home</Link><p className={styles.eyebrow}>KAILA Community</p><h1>Local help, shared by neighbors</h1><p>Practical stories and tips from the people doing the work.</p><Link className={styles.actionLink} href="/community/share">Share a story</Link></header>
    {state === "loading" && <><div className={styles.skeleton} /><div className={styles.skeleton} /></>}
    {state === "error" && <Feedback kind="error" title="Community could not load"><Button variant="secondary" onClick={() => void load()}>Try again</Button></Feedback>}
    {state === "ready" && posts.length === 0 && <div className={styles.empty}><HeartHandshake aria-hidden="true" /><h2>No stories yet</h2><p>Share a useful local service tip when you are signed in.</p><Link className={styles.actionLink} href="/">Find local help</Link></div>}
    {posts.length > 0 && <section className={styles.grid} aria-label="Community posts">{posts.map((post) => <article className={styles.card} key={post.id}><p className={styles.eyebrow}>{post.kind.replaceAll("_", " ")}</p><h2>{post.title}</h2><p>{post.body}</p><p className={styles.meta}>{post.author?.name ?? "KAILA member"}{post.areaLabel && <> · <MapPin aria-hidden="true" /> {post.areaLabel}</>} · {post.helpfulCount} helpful</p></article>)}</section>}
  </main>;
}
