import type { Metadata } from "next";

export const SITE_NAME = "KAILA";
export const SITE_URL = "https://kaila-app.com";
export const SITE_DESCRIPTION =
  "KAILA is the local services marketplace app for the Philippines. Post a job, compare nearby provider offers, chat, and follow the work in one place.";
export const SITE_KEYWORDS = [
  "KAILA",
  "KAILA app",
  "KAILA Philippines",
  "local services marketplace",
  "hire service providers Philippines",
  "find plumber near me",
  "find cleaner near me",
  "local help app",
  "service providers Philippines",
  "post a job Philippines",
];

const googleSiteVerification = process.env.KAILA_GOOGLE_SITE_VERIFICATION;
const bingSiteVerification = process.env.KAILA_BING_SITE_VERIFICATION;

const basePublicMetadata = ({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata => ({
  title,
  description,
  keywords: SITE_KEYWORDS,
  alternates: {
    canonical: path,
    languages: {
      "en-PH": path,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  ...(googleSiteVerification || bingSiteVerification
    ? {
        verification: {
          ...(googleSiteVerification ? { google: googleSiteVerification } : {}),
          ...(bingSiteVerification ? { other: { "msvalidate.01": bingSiteVerification } } : {}),
        },
      }
    : {}),
});

export const publicPageMetadata = ({
  title,
  description,
  path,
  openGraph,
  twitter,
}: {
  title: string;
  description: string;
  path: string;
  openGraph?: Metadata["openGraph"];
  twitter?: Metadata["twitter"];
}): Metadata => ({
  ...basePublicMetadata({ title, description, path }),
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: path,
    siteName: SITE_NAME,
    title,
    description,
    ...openGraph,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    ...twitter,
  },
});

export const communityPostMetadata = ({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Metadata =>
  publicPageMetadata({
    title,
    description,
    path,
    openGraph: {
      type: "article",
      url: path,
      title,
      description,
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  });

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
