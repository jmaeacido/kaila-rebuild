import type { Metadata } from "next";
import { publicPageMetadata } from "../seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Frequently Asked Questions",
  description: "Answers about hiring locally, offering services, and staying safe on KAILA.",
  path: "/faqs",
});

export default function FaqsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
