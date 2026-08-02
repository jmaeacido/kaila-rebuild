import type { Metadata } from "next";

export const SITE_NAME = "KAILA";
export const SITE_URL = "https://kaila-app.com";
export const SITE_DESCRIPTION =
  "Find trusted local service providers for repairs, cleaning, personal care, lessons, and more. Post a job, compare offers, chat, and follow the work in KAILA.";

export const publicPageMetadata = ({
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
  alternates: { canonical: path },
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
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: path,
    siteName: SITE_NAME,
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
});

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
