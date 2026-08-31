import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  communityPostDescription,
  communityPostOpenGraphImage,
  communityPostStructuredData,
  fetchPublicCommunityPost,
} from "../../../lib/community-public";
import { communityPostMetadata, safeJsonLd, SITE_URL } from "../../seo";
import { CommunityPostDetail } from "./community-post-detail";

type PageProps = {
  params: Promise<{ postId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { postId } = await params;
  const post = await fetchPublicCommunityPost(postId);
  if (!post) {
    return {
      title: "Community post unavailable",
      robots: { index: false, follow: false },
    };
  }

  return communityPostMetadata({
    title: post.title,
    description: communityPostDescription(post),
    path: `/community/${post.id}`,
    image: communityPostOpenGraphImage(post, SITE_URL),
  });
}

export default async function CommunityPostPage({ params }: PageProps) {
  const { postId } = await params;
  const post = await fetchPublicCommunityPost(postId);
  if (!post) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(communityPostStructuredData(post, SITE_URL)) }}
      />
      <CommunityPostDetail postId={postId} initialPost={post} />
    </>
  );
}
