"use client";

import Link from "next/link";
import type { CommunityPost } from "./community-client";
import { CommunityLinkedMentionText } from "./community-linked-provider-text";
import styles from "./community.module.css";

export function CommunityWelcomeTitle({
  post,
  postHref,
  heading: Heading = "h2",
  className,
}: {
  post: CommunityPost;
  postHref: string;
  heading?: "h1" | "h2";
  className?: string;
}) {
  const provider = post.featuredProvider;
  const isProviderWelcome = post.kind === "official_update" && post.hashtags.includes("newprovider") && provider;

  if (!isProviderWelcome) {
    return (
      <Heading className={className}>
        <Link href={postHref}>{post.title}</Link>
      </Heading>
    );
  }

  return (
    <Heading className={className}>
      <Link href={postHref}>Welcome </Link>
      <Link className={styles.featuredProviderLink} href={`/providers/${provider.id}`}>
        {provider.displayName}
      </Link>
      <Link href={postHref}> to KAILA</Link>
    </Heading>
  );
}

export function CommunityWelcomeBody({
  post,
  maxLength,
  className,
}: {
  post: CommunityPost;
  maxLength?: number;
  className?: string;
}) {
  const provider = post.featuredProvider;
  const mention = post.mention ?? (provider ? { userId: 0, displayName: provider.displayName, providerProfileId: provider.id, kind: "provider" as const } : null);
  const body = maxLength && post.body.length > maxLength ? `${post.body.slice(0, maxLength)}…` : post.body;
  const bodyClassName = className ?? styles.body;

  if (!mention) {
    return <p className={bodyClassName}>{body}</p>;
  }

  return (
    <p className={bodyClassName}>
      <CommunityLinkedMentionText text={body} mention={mention} />
    </p>
  );
}
