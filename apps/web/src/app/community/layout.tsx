import type { Metadata } from "next";
import { breadcrumbStructuredData } from "../../lib/seo-structured-data";
import { publicPageMetadata, safeJsonLd } from "../seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Community — Local help, shared",
  description:
    "Browse KAILA Community for useful local tips, service questions, work stories, and official updates from people near you in the Philippines.",
  path: "/community",
});

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(
            breadcrumbStructuredData([
              { name: "KAILA", path: "/" },
              { name: "Community", path: "/community" },
            ]),
          ),
        }}
      />
      {children}
    </>
  );
}
