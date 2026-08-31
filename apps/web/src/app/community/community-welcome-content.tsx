"use client";

import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import type { CommunityPost } from "./community-client";
import styles from "./community.module.css";

function linkDisplayName(text: string, provider: NonNullable<CommunityPost["featuredProvider"]>): ReactNode {
  const parts = text.split(provider.displayName);
  if (parts.length === 1) {
    return text;
  }

  return parts.map((part, index) => (
    <Fragment key={`${index}-${part.slice(0, 12)}`}>
      {part}
      {index < parts.length - 1 ? (
        <Link className={styles.featuredProviderLink} href={`/providers/${provider.id}`}>
          {provider.displayName}
        </Link>
      ) : null}
    </Fragment>
  ));
}

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
  if (!provider) {
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
  const body = maxLength && post.body.length > maxLength ? `${post.body.slice(0, maxLength)}…` : post.body;
  const bodyClassName = className ?? styles.body;

  if (!provider) {
    return <p className={bodyClassName}>{body}</p>;
  }

  return <p className={bodyClassName}>{linkDisplayName(body, provider)}</p>;
}
