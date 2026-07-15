import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
