import { Suspense } from "react";
import { fetchPublicCommunityFeed } from "../../lib/community-public";
import { safeJsonLd, SITE_URL } from "../seo";
import { CommunityCrawlLinks } from "./community-crawl-links";
import { CommunityFeed } from "./community-feed";

export default async function CommunityPage() {
  const initialPosts = await fetchPublicCommunityFeed();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "KAILA Community",
    url: `${SITE_URL}/community`,
    description: "Useful local tips, service questions, and work stories from the KAILA community.",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    hasPart: initialPosts.map((post) => ({
      "@type": "SocialMediaPosting",
      "@id": `${SITE_URL}/community/${post.id}#post`,
      headline: post.title,
      url: `${SITE_URL}/community/${post.id}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />
      <Suspense fallback={null}>
        <CommunityFeed initialPosts={initialPosts} />
      </Suspense>
      <CommunityCrawlLinks posts={initialPosts} />
    </>
  );
}
