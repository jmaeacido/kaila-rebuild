const apiOrigin = () => process.env.KAILA_API_ORIGIN ?? "http://127.0.0.1:8000";

export type PublicCommunityPost = {
  id: string;
  kind: string;
  title: string;
  body: string;
  hashtags: string[];
  area: { id: number; name: string } | null;
  areaLabel: string | null;
  author: { name: string; official: boolean };
  mention: {
    userId: number;
    displayName: string;
    providerProfileId: number | null;
    kind: "provider" | "client";
  } | null;
  featuredProvider: { id: number; displayName: string } | null;
  helpfulCount: number;
  commentsCount: number;
  media: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    scanStatus: string;
    url: string | null;
  }>;
  publishedAt: string;
  editedAt: string | null;
};

export type PublicCommunitySitemapEntry = {
  id: string;
  title: string;
  publishedAt: string | null;
  updatedAt: string | null;
};

type FeedResponse = {
  data: PublicCommunityPost[];
  meta: { nextCursor: string | null };
};

async function readJson<T>(response: Response): Promise<T | null> {
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export async function fetchPublicCommunityPost(postId: string): Promise<PublicCommunityPost | null> {
  const response = await fetch(`${apiOrigin()}/api/v1/public/community/${encodeURIComponent(postId)}`, {
    next: { revalidate: 300 },
  });
  const body = await readJson<{ data: PublicCommunityPost }>(response);
  return body?.data ?? null;
}

export async function fetchPublicCommunityFeed(limit = 12): Promise<PublicCommunityPost[]> {
  const response = await fetch(`${apiOrigin()}/api/v1/public/community/feed`, {
    next: { revalidate: 300 },
  });
  const body = await readJson<FeedResponse>(response);
  return body?.data.slice(0, limit) ?? [];
}

export async function fetchPublicCommunitySitemapEntries(): Promise<PublicCommunitySitemapEntry[]> {
  const response = await fetch(`${apiOrigin()}/api/v1/public/community`, {
    next: { revalidate: 300 },
  });
  const body = await readJson<{ data: PublicCommunitySitemapEntry[] }>(response);
  return body?.data ?? [];
}

export function communityPostDescription(post: Pick<PublicCommunityPost, "body" | "areaLabel">): string {
  const excerpt = post.body.replace(/\s+/g, " ").trim().slice(0, 155);
  const suffix = post.areaLabel ? ` · ${post.areaLabel}` : "";
  return `${excerpt}${suffix}`.trim();
}

export function communityPostOpenGraphImage(post: PublicCommunityPost, siteUrl: string): string | undefined {
  const image = post.media.find((item) => item.url && item.mimeType.startsWith("image/"));
  if (!image?.url) return undefined;
  return image.url.startsWith("http") ? image.url : `${siteUrl}${image.url}`;
}

export function communityPostStructuredData(post: PublicCommunityPost, siteUrl: string) {
  const pageUrl = `${siteUrl}/community/${post.id}`;
  const image = communityPostOpenGraphImage(post, siteUrl);

  return {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    "@id": `${pageUrl}#post`,
    headline: post.title,
    articleBody: post.body,
    datePublished: post.publishedAt,
    dateModified: post.editedAt ?? post.publishedAt,
    url: pageUrl,
    author: {
      "@type": post.author.official ? "Organization" : "Person",
      name: post.author.name,
    },
    publisher: { "@id": `${siteUrl}/#organization` },
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: post.helpfulCount,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: post.commentsCount,
      },
    ],
    ...(image ? { image: [image] } : {}),
    ...(post.areaLabel
      ? {
          contentLocation: {
            "@type": "Place",
            name: post.areaLabel,
          },
        }
      : {}),
  };
}
