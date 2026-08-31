"use client";

import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import type { CommunityMention } from "./community-client";
import styles from "./community.module.css";

export function linkMentionDisplayName(text: string, mention: CommunityMention): ReactNode {
  const parts = text.split(mention.displayName);
  if (parts.length === 1) {
    return text;
  }

  return parts.map((part, index) => (
    <Fragment key={`${index}-${part.slice(0, 12)}`}>
      {part}
      {index < parts.length - 1 ? (
        mention.providerProfileId ? (
          <Link className={styles.featuredProviderLink} href={`/providers/${mention.providerProfileId}`}>
            {mention.displayName}
          </Link>
        ) : (
          <span className={styles.mentionedMember}>{mention.displayName}</span>
        )
      ) : null}
    </Fragment>
  ));
}

export function CommunityLinkedMentionText({
  text,
  mention,
  className,
}: {
  text: string;
  mention: CommunityMention | null;
  className?: string;
}) {
  if (!mention) {
    return <span className={className}>{text}</span>;
  }

  return <span className={className}>{linkMentionDisplayName(text, mention)}</span>;
}

// Backward-compatible alias for welcome posts that still expose featuredProvider.
export function CommunityLinkedProviderText({
  text,
  provider,
  mention,
  className,
}: {
  text: string;
  provider?: { id: number; displayName: string } | null;
  mention?: CommunityMention | null;
  className?: string;
}) {
  const resolved = mention ?? (provider ? { userId: 0, displayName: provider.displayName, providerProfileId: provider.id, kind: "provider" as const } : null);
  return <CommunityLinkedMentionText text={text} mention={resolved} className={className} />;
}
