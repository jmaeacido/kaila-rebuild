export type CommunityMedia = { id: string; originalName: string; mimeType: string; scanStatus: string; url: string | null };
export type CommunityFeaturedProvider = { id: number; displayName: string };
export type CommunityMention = { userId: number; displayName: string; providerProfileId: number | null; kind: "provider" | "client" };
export type CommunityPost = { id: string; kind: string; title: string; body: string; hashtags: string[]; area: { id: number; name: string } | null; areaLabel: string | null; author: { id: number; name: string; official: boolean }; mention: CommunityMention | null; featuredProvider: CommunityFeaturedProvider | null; helpful: boolean; helpfulCount: number; commentsCount: number; media: CommunityMedia[]; canManage: boolean; publishedAt: string; editedAt: string | null };
export type CommunityComment = { id: string; body: string; mention: CommunityMention | null; featuredProvider: CommunityFeaturedProvider | null; author: { id: number; name: string; avatarUrl: string | null }; canEdit: boolean; canDelete: boolean; canHide: boolean; createdAt: string; replies: CommunityComment[] };
export type CommunityFeedContext = {
  homeArea: { id: number; name: string } | null;
  trendingTags: Array<{ tag: string; count: number }>;
  newProviders: Array<{ id: string; title: string; areaLabel: string | null; publishedAt: string | null; mediaUrl: string | null; providerProfileId: number | null; providerDisplayName: string | null }>;
};

type PublicCommunityPostInput = Omit<CommunityPost, "author" | "helpful" | "canManage"> & {
  author: { name: string; official: boolean };
};

export function mapPublicCommunityPost(post: PublicCommunityPostInput): CommunityPost {
  return {
    ...post,
    author: { id: 0, name: post.author.name, official: post.author.official },
    helpful: false,
    canManage: false,
  };
}

export function normalizeCommunityPost(post: CommunityPost | PublicCommunityPostInput): CommunityPost {
  if ("canManage" in post) return post;
  return mapPublicCommunityPost(post);
}

export async function fetchCommunityFeed(query: URLSearchParams): Promise<Response> {
  const paths = [`/api/v1/community?${query}`, `/api/v1/public/community/feed?${query}`];
  for (const path of paths) {
    const response = await fetch(path, { cache: "no-store" });
    if (response.ok) return response;
  }
  return fetch(paths[0], { cache: "no-store" });
}

export async function csrfFetch(path: string, init: RequestInit = {}) {
  await fetch("/api/v1/auth/csrf", { credentials: "include" });
  const token = document.cookie.split("; ").find((value) => value.startsWith("XSRF-TOKEN="))?.split("=")[1];
  return fetch(path, { ...init, credentials: "include", headers: { Accept: "application/json", ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {}), ...init.headers } });
}

export const kindLabels: Record<string, string> = { work_story: "Work showcase", local_tip: "Local tip", service_question: "Service question", official_update: "Official update" };
