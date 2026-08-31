import type { Metadata } from "next";
import { publicPageMetadata } from "../seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Account Deletion",
  description: "How to request deletion of your KAILA account and what happens to your marketplace data.",
  path: "/account-deletion",
});

export default function AccountDeletionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
