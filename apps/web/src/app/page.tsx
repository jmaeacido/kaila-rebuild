import type { Metadata } from "next";
import LandingPage from "./landing-page";
import { LandingSeoSection } from "./landing-seo-section";
import { fetchPublicCommunityFeed } from "../lib/community-public";
import { homeStructuredData } from "../lib/seo-structured-data";
import { publicPageMetadata, safeJsonLd, SITE_DESCRIPTION, SITE_URL } from "./seo";

const title = "KAILA — Hire Local Service Providers in the Philippines";

export const metadata: Metadata = publicPageMetadata({
  title,
  description: SITE_DESCRIPTION,
  path: "/",
  openGraph: {
    title,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: "/opengraph-image", alt: "KAILA local services marketplace" }],
  },
});

export default async function Page() {
  const recentPosts = await fetchPublicCommunityFeed(8);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(homeStructuredData()) }}
      />
      <LandingPage />
      <LandingSeoSection recentPosts={recentPosts} />
    </>
  );
}
