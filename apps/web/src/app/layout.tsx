import type { Metadata } from "next";
import "./globals.css";
import { OnlineStatus } from "./online-status";

export const metadata: Metadata = {
  title: "KAILA — Local services near you",
  description: "Find trusted independent service providers in your area.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><OnlineStatus />{children}</body>
    </html>
  );
}
