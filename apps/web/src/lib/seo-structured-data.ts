import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "../app/seo";

export type FaqStructuredItem = {
  question: string;
  answer: string;
};

export function organizationStructuredData() {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: ["KAILA App", "KAILA Philippines", "KAILA local services"],
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    image: `${SITE_URL}/opengraph-image`,
    description: SITE_DESCRIPTION,
    email: "support@kaila-app.com",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@kaila-app.com",
      areaServed: "PH",
      availableLanguage: ["en", "en-PH"],
    },
    areaServed: {
      "@type": "Country",
      name: "Philippines",
    },
  };
}

export function websiteStructuredData() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    alternateName: "KAILA App",
    description: SITE_DESCRIPTION,
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-PH",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/community?tag={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function marketplaceServiceStructuredData() {
  return {
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
    audience: {
      "@type": "Audience",
      audienceType: "Clients and independent service providers in the Philippines",
    },
  };
}

export function androidAppStructuredData() {
  return {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/download#android-app`,
    name: SITE_NAME,
    operatingSystem: "Android",
    applicationCategory: "BusinessApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "PHP",
    },
    description: "Official KAILA Android app for posting jobs, comparing local offers, and managing service work.",
    downloadUrl: `${SITE_URL}/download`,
    installUrl: `${SITE_URL}/download`,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function homeStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationStructuredData(),
      websiteStructuredData(),
      marketplaceServiceStructuredData(),
      androidAppStructuredData(),
    ],
  };
}

export function faqPageStructuredData(items: FaqStructuredItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbStructuredData(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems(items),
  };
}

export function breadcrumbItems(items: Array<{ name: string; path: string }>) {
  return items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: `${SITE_URL}${item.path}`,
  }));
}
