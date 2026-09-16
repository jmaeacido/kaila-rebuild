import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fetchPublicProvider, publicProviderDescription } from "../../../lib/provider-public";
import { publicPageMetadata, SITE_URL } from "../../seo";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ providerId: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { providerId } = await params;
  const provider = await fetchPublicProvider(providerId);
  if (!provider) {
    return {
      title: "Provider unavailable",
      robots: { index: false, follow: false },
    };
  }

  const title = `${provider.displayName} - Local Service Provider`;
  const description = publicProviderDescription(provider);
  const path = `/providers/${provider.publicSlug}`;
  const image = provider.avatarUrl
    ? provider.avatarUrl.startsWith("http") ? provider.avatarUrl : `${SITE_URL}${provider.avatarUrl}`
    : undefined;

  return publicPageMetadata({
    title,
    description,
    path,
    openGraph: {
      type: "profile",
      url: path,
      title,
      description,
      ...(image ? { images: [{ url: image, alt: `${provider.displayName} provider profile` }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  });
}

export default function ProviderProfileLayout({ children }: LayoutProps) {
  return children;
}
