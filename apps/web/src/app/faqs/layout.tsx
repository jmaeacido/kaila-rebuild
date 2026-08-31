import type { Metadata } from "next";
import { faqGroups } from "./faq-data";
import { faqPageStructuredData } from "../../lib/seo-structured-data";
import { publicPageMetadata, safeJsonLd } from "../seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Frequently Asked Questions",
  description:
    "Official KAILA answers about posting jobs, provider offers, coverage, travel, safety, notifications, and support in the Philippines.",
  path: "/faqs",
});

const faqStructuredData = faqPageStructuredData(
  faqGroups.flatMap((group) => group.items.map(({ question, answer }) => ({ question, answer }))),
);

export default function FaqsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqStructuredData) }}
      />
      {children}
    </>
  );
}
