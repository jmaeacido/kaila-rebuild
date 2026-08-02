import type { Metadata } from "next";
import LandingPage from "./landing-page";
import {
  publicPageMetadata,
  safeJsonLd,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "./seo";

const title = "KAILA — Local Services Near You in the Philippines";

export const metadata: Metadata = publicPageMetadata({
  title,
  description: SITE_DESCRIPTION,
  path: "/",
});

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
      description: SITE_DESCRIPTION,
      areaServed: {
        "@type": "Country",
        name: "Philippines",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-PH",
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/#marketplace-service`,
      name: "KAILA local services marketplace",
      serviceType: "Local services marketplace",
      provider: { "@id": `${SITE_URL}/#organization` },
      areaServed: {
        "@type": "Country",
        name: "Philippines",
      },
      description: SITE_DESCRIPTION,
      url: SITE_URL,
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
      />
      <LandingPage />
    </>
  );
}
