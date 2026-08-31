import type { Metadata } from "next";
import { StatusPage } from "../../../components/status-page";

export const metadata: Metadata = {
  title: "Community post unavailable",
  robots: {
    index: false,
    follow: true,
  },
};

export default function CommunityPostNotFound() {
  return <StatusPage code={404} />;
}
