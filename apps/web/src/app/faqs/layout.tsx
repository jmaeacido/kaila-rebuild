import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQs | KAILA",
  description: "Answers about hiring locally, offering services, and staying safe on KAILA.",
};

export default function FaqsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
